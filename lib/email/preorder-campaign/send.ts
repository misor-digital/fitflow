/**
 * Preorder Campaign — Send Orchestrator
 *
 * Server-only module that orchestrates the conversion email send:
 * fetches eligible recipients, renders templates, and either sends
 * via Brevo (live) or logs only (dry-run).
 *
 * - Live sends go through `sendTransactionalEmail` which already
 *   logs to `email_send_log` via its wired callback — no double-logging.
 * - Dry-run sends log directly via `logEmailSent` with a distinct
 *   category ('preorder-conversion-dry-run') for easy identification.
 * - Sequential processing with a delay between sends to respect
 *   Brevo rate limits.
 */

import 'server-only';

import { getEligiblePreorderRecipients } from './recipients';
import { renderPreorderEmail } from './template';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import { logEmailSent } from '@/lib/data/email-log';
import type { EmailSendLogInsert } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_SUBJECT = 'FitFlow — Твоята кутия е готова!';
const EMAIL_CATEGORY = 'preorder-conversion';
const DRY_RUN_CATEGORY = 'preorder-conversion-dry-run';

/** Delay between sends in ms to avoid Brevo rate limiting */
const BATCH_DELAY_MS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendResult {
  dryRun: boolean;
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  recipients: Array<{
    email: string;
    fullName: string;
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
 * Send preorder conversion emails to all eligible recipients.
 *
 * @param options.dryRun - If true, renders templates and logs to
 *   email_send_log with category 'preorder-conversion-dry-run' but
 *   does NOT call Brevo. If false, sends via Brevo transactional API.
 */
export async function sendPreorderConversionEmails(options: {
  dryRun: boolean;
}): Promise<SendResult> {
  const { dryRun } = options;

  // Step 1: Fetch eligible recipients
  const recipients = await getEligiblePreorderRecipients();

  if (recipients.length === 0) {
    return {
      dryRun,
      totalEligible: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      recipients: [],
    };
  }

  // Step 2: Process each recipient sequentially (respect rate limits)
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results: SendResult['recipients'] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      if (dryRun) {
        // Render the template to validate it works
        renderPreorderEmail(recipient);

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
            promoCode: recipient.promoCode,
            orderId: recipient.orderId,
          },
          related_entity_type: 'preorder',
          related_entity_id: recipient.preorderId,
        };

        await logEmailSent(logEntry);

        skipped++;
        results.push({
          email: recipient.email,
          fullName: recipient.fullName,
          status: 'skipped',
        });
      } else {
        // Render the final HTML
        const html = renderPreorderEmail(recipient);

        // Send via Brevo — the callback already logs to email_send_log
        const result = await sendTransactionalEmail({
          to: { email: recipient.email, name: recipient.fullName },
          subject: EMAIL_SUBJECT,
          htmlContent: html,
          tags: ['preorder-conversion'],
          category: EMAIL_CATEGORY,
          relatedEntityType: 'preorder',
          relatedEntityId: recipient.preorderId,
        });

        if (result.success) {
          sent++;
          results.push({
            email: recipient.email,
            fullName: recipient.fullName,
            status: 'sent',
          });
        } else {
          failed++;
          results.push({
            email: recipient.email,
            fullName: recipient.fullName,
            status: 'failed',
            error: result.error,
          });
        }

        // Delay between sends to avoid rate limiting
        if (i < recipients.length - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    } catch (err) {
      failed++;
      results.push({
        email: recipient.email,
        fullName: recipient.fullName,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 3: Return summary
  return {
    dryRun,
    totalEligible: recipients.length,
    sent,
    failed,
    skipped,
    recipients: results,
  };
}
