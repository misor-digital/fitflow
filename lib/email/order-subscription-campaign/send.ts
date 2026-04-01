/**
 * Order-to-Subscription Campaign — Send Orchestrator
 *
 * Server-only module that orchestrates the conversion email send:
 * fetches eligible recipients, generates tokens, renders templates,
 * and either sends via Brevo (live) or logs only (dry-run).
 *
 * - Live sends go through `sendTransactionalEmail` which already
 *   logs to `email_send_log` via its wired callback — no double-logging.
 * - Dry-run sends log directly via `logEmailSent` with a distinct
 *   category ('order-to-sub-conversion-dry-run') for easy identification.
 * - Sequential processing with a delay between sends to respect
 *   Brevo rate limits.
 */

import 'server-only';

import { getEligibleOrderConversionRecipients } from './recipients';
import { renderOrderConversionEmail } from './template';
import { generateConversionTokens, getEligibleOrdersForSubscription } from '@/lib/data/order-subscription-conversion';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import { logEmailSent } from '@/lib/data/email-log';
import type { EmailSendLogInsert } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';
const EMAIL_SUBJECT = 'FitFlow — Абонирай се и спести!';
const EMAIL_CATEGORY = 'order-to-sub-conversion';
const DRY_RUN_CATEGORY = 'order-to-sub-conversion-dry-run';

/** Delay between sends in ms to avoid Brevo rate limiting */
const BATCH_DELAY_MS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderConversionSendOptions {
  dryRun: boolean;
  includeIds?: string[];
  campaignPromoCode?: string | null;
}

export interface OrderConversionSendResult {
  dryRun: boolean;
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  recipients: Array<{
    orderId: string;
    email: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Send order-to-subscription conversion emails to eligible recipients.
 *
 * @param options.dryRun - If true, renders templates and logs to
 *   email_send_log with category 'order-to-sub-conversion-dry-run' but
 *   does NOT call Brevo. If false, sends via Brevo transactional API.
 * @param options.includeIds - Optional allowlist of order UUIDs.
 *   When provided, only recipients whose orderId is in the list
 *   will be processed. When omitted, all eligible recipients are sent.
 * @param options.campaignPromoCode - Optional promo code to embed in
 *   conversion URLs and display in the email template.
 */
export async function sendOrderConversionEmails(
  options: OrderConversionSendOptions,
): Promise<OrderConversionSendResult> {
  const { dryRun, includeIds, campaignPromoCode } = options;

  // Step 1: Fetch eligible recipients
  const allRecipients = await getEligibleOrderConversionRecipients();
  const recipients = includeIds
    ? allRecipients.filter((r) => includeIds.includes(r.orderId))
    : allRecipients;

  if (recipients.length === 0) {
    return { dryRun, totalEligible: 0, sent: 0, failed: 0, skipped: 0, recipients: [] };
  }

  // Step 2: Generate conversion tokens for all included orders
  const orderIds = recipients.map((r) => r.orderId);
  await generateConversionTokens(orderIds);

  // Step 3: Re-fetch to get generated tokens
  const refreshed = await getEligibleOrdersForSubscription();
  const tokenMap = new Map(
    refreshed
      .filter((o) => o.subscription_conversion_token)
      .map((o) => [o.id, o.subscription_conversion_token!]),
  );

  // Step 4: Build conversion URLs
  for (const r of recipients) {
    const token = tokenMap.get(r.orderId);
    if (!token) continue;
    r.subscriptionConversionToken = token;
    const url = new URL(`${SITE_URL}/subscription/convert`);
    url.searchParams.set('token', token);
    if (campaignPromoCode) {
      url.searchParams.set('promo', campaignPromoCode);
    }
    r.conversionUrl = url.toString();
  }

  // Step 5: Process each recipient sequentially (respect rate limits)
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results: OrderConversionSendResult['recipients'] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    // Skip recipients without a valid conversion URL
    if (!recipient.conversionUrl) {
      skipped++;
      results.push({ orderId: recipient.orderId, email: recipient.email, status: 'skipped', error: 'No conversion token' });
      continue;
    }

    try {
      if (dryRun) {
        // Render the template to validate it works
        renderOrderConversionEmail(recipient, campaignPromoCode ?? undefined);

        // Log to email_send_log with dry-run category
        const logEntry: EmailSendLogInsert = {
          email_type: 'transactional',
          email_category: DRY_RUN_CATEGORY,
          recipient_email: recipient.email,
          recipient_name: recipient.fullName,
          subject: EMAIL_SUBJECT,
          status: 'sent',
          params: {
            fullName: recipient.fullName,
            boxType: recipient.boxType,
            conversionUrl: recipient.conversionUrl,
            promoCode: campaignPromoCode ?? null,
            orderId: recipient.orderId,
          },
          related_entity_type: 'order',
          related_entity_id: recipient.orderId,
        };

        await logEmailSent(logEntry);

        skipped++;
        results.push({ orderId: recipient.orderId, email: recipient.email, status: 'skipped' });
      } else {
        // Render the final HTML
        const html = renderOrderConversionEmail(recipient, campaignPromoCode ?? undefined);

        // Send via Brevo — the callback already logs to email_send_log
        const result = await sendTransactionalEmail({
          to: { email: recipient.email, name: recipient.fullName },
          subject: EMAIL_SUBJECT,
          htmlContent: html,
          tags: ['order-to-sub-conversion'],
          category: EMAIL_CATEGORY,
          relatedEntityType: 'order',
          relatedEntityId: recipient.orderId,
        });

        if (result.success) {
          sent++;
          results.push({ orderId: recipient.orderId, email: recipient.email, status: 'sent' });
        } else {
          failed++;
          results.push({ orderId: recipient.orderId, email: recipient.email, status: 'failed', error: result.error });
        }

        // Delay between sends to avoid rate limiting
        if (i < recipients.length - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    } catch (err) {
      failed++;
      results.push({
        orderId: recipient.orderId,
        email: recipient.email,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { dryRun, totalEligible: recipients.length, sent, failed, skipped, recipients: results };
}
