/**
 * Campaign Processing Engine
 *
 * Processes campaign recipients in batches using the Brevo transactional API.
 * Handles rate limiting, error recovery, and progress tracking.
 *
 * Design decisions:
 * - Sequential per-recipient sends (not Brevo batch messageVersions) for
 *   per-recipient error tracking. Batch optimization deferred to Phase E9.
 * - Runs to completion (or pause) within a single request — no background workers.
 * - For large campaigns (500+ recipients) the cron processor (Phase E10) will
 *   trigger processing in chunks across multiple invocations.
 */

import 'server-only';

import { sendEmail, sendTemplateEmail } from './emailService';
import type { EmailResult } from './types';
import {
  getNextBatch,
  getRecipientStats,
  markRecipientSent,
  markRecipientFailed,
  markRecipientSkipped,
} from '@/lib/data/email-recipients';
import {
  updateCampaignStatus,
  incrementCampaignCounters,
  getCampaignById,
} from '@/lib/data/email-campaigns';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';
import { logEmailSent } from '@/lib/data/email-log';
import { incrementUsage } from '@/lib/data/email-usage';
import { isUnsubscribed } from './unsubscribe';
import {
  buildVariantMap,
  incrementVariantSentCount,
} from './ab-testing';
import type {
  EmailCampaignRow,
  EmailCampaignRecipientRow,
  EmailABVariantRow,
} from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a send function with exponential-backoff retry on rate-limit (429).
 * Non-rate-limit errors are returned immediately.
 */
async function sendWithRetry(
  sendFn: () => Promise<EmailResult>,
  retries: number = MAX_RETRIES,
): Promise<EmailResult> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await sendFn();
    if (result.success) return result;

    // Check if rate limited (Brevo error message contains "429" or "rate limit")
    const isRateLimited =
      result.error?.includes('429') ||
      result.error?.toLowerCase().includes('rate limit');

    if (isRateLimited && attempt < retries) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[campaign-engine] Rate limited — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return result; // Non-rate-limit error or exhausted retries
  }

  return { success: false, error: 'Exhausted retries' };
}

/**
 * Re-fetch the campaign to check if it's still in 'sending' status.
 * Allows pause / cancel to take effect between batches.
 */
async function isCampaignStillActive(campaignId: string): Promise<boolean> {
  const campaign = await getCampaignById(campaignId);
  return campaign?.status === 'sending';
}

// ---------------------------------------------------------------------------
// Per-recipient send
// ---------------------------------------------------------------------------

/**
 * Send to a single recipient and record the outcome.
 * Supports A/B variant overrides for subject, template, and params.
 * Returns `true` if the send succeeded.
 */
async function processRecipient(
  campaign: EmailCampaignRow,
  recipient: EmailCampaignRecipientRow,
  variant?: EmailABVariantRow | null,
): Promise<boolean> {
  // Determine effective subject, template, and params (variant overrides campaign)
  const effectiveSubject = variant?.subject ?? campaign.subject;
  const effectiveTemplateId = variant?.template_id ?? campaign.template_id;
  const effectiveParams: Record<string, unknown> = {
    ...(campaign.params ?? {}),
    ...(variant?.params ?? {}),
    ...(recipient.params ?? {}),
  };

  // Build the send call
  const result = await sendWithRetry(() => {
    if (effectiveTemplateId) {
      return sendTemplateEmail({
        to: { email: recipient.email, name: recipient.full_name ?? undefined },
        templateId: effectiveTemplateId,
        params: effectiveParams as Record<string, string | number | boolean | string[]>,
        tags: ['campaign', campaign.campaign_type],
      });
    }

    // Fallback to HTML content
    return sendEmail({
      to: { email: recipient.email, name: recipient.full_name ?? undefined },
      subject: effectiveSubject,
      htmlContent: campaign.html_content ?? undefined,
      params: effectiveParams as Record<string, string | number | boolean>,
      tags: ['campaign', campaign.campaign_type],
    });
  });

  if (result.success) {
    await markRecipientSent(recipient.id, result.messageId ?? '');

    // Increment variant counter if A/B test
    if (variant) {
      incrementVariantSentCount(variant.id).catch(() => {});
    }

    // Fire-and-forget logging — never block the engine
    logEmailSent({
      email_type: 'campaign',
      email_category: campaign.campaign_type,
      recipient_email: recipient.email,
      recipient_name: recipient.full_name,
      subject: effectiveSubject,
      template_id: effectiveTemplateId,
      brevo_message_id: result.messageId ?? null,
      campaign_id: campaign.id,
      status: 'sent',
      params: effectiveParams as Record<string, unknown>,
    }).catch(() => {});

    return true;
  }

  // Send failed
  await markRecipientFailed(recipient.id, result.error ?? 'Unknown send error');

  logEmailSent({
    email_type: 'campaign',
    email_category: campaign.campaign_type,
    recipient_email: recipient.email,
    recipient_name: recipient.full_name,
    subject: effectiveSubject,
    template_id: effectiveTemplateId,
    campaign_id: campaign.id,
    status: 'failed',
    error: result.error ?? 'Unknown send error',
  }).catch(() => {});

  return false;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface ProcessCampaignResult {
  sent: number;
  failed: number;
  skipped: number;
  stopped: boolean; // true if processing was interrupted by pause/cancel
}

/**
 * Process all pending recipients for a campaign.
 *
 * Pre-conditions:
 * - Campaign must already be in `'sending'` status (use lifecycle functions).
 * - Recipients must already be populated (use recipient-builder functions).
 *
 * The function processes recipients in batches of {@link BATCH_SIZE} and
 * checks between batches whether the campaign was paused or cancelled.
 */
export async function processCampaign(
  campaignId: string,
  userId: string,
): Promise<ProcessCampaignResult> {
  // 1. Load & validate campaign
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found.`);
  }
  if (campaign.status !== 'sending') {
    throw new Error(
      `Campaign ${campaignId} is in '${campaign.status}' status — expected 'sending'.`,
    );
  }

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let stopped = false;

  try {
    // 2. Build A/B variant map (empty if no A/B test)
    const variantMap = await buildVariantMap(campaignId);

    // 3. Batch loop
    while (true) {
      const batch = await getNextBatch(campaignId, BATCH_SIZE);
      if (batch.length === 0) break; // all recipients processed

      let batchSent = 0;
      let batchFailed = 0;

      for (const recipient of batch) {
        // Check unsubscribe status before sending
        const unsubscribed = await isUnsubscribed(recipient.email);
        if (unsubscribed) {
          await markRecipientSkipped(recipient.id, 'Отписан от имейли');
          totalSkipped++;
          continue;
        }

        // Resolve A/B variant (if any)
        const variant = recipient.variant_id
          ? variantMap.get(recipient.variant_id) ?? null
          : null;

        const success = await processRecipient(campaign, recipient, variant);
        if (success) {
          batchSent++;
        } else {
          batchFailed++;
        }
      }

      // Increment counters atomically after each batch
      await incrementCampaignCounters(campaignId, batchSent, batchFailed);
      totalSent += batchSent;
      totalFailed += batchFailed;

      console.log(
        `[campaign-engine] Batch complete: ${batchSent} sent, ${batchFailed} failed (campaign ${campaignId})`,
      );

      // 4. Check if campaign was paused or cancelled between batches
      const stillActive = await isCampaignStillActive(campaignId);
      if (!stillActive) {
        console.log(
          `[campaign-engine] Campaign ${campaignId} is no longer 'sending' — stopping.`,
        );
        stopped = true;
        break;
      }
    }

    // 5. Mark campaign complete if we processed everything (not stopped)
    if (!stopped) {
      await updateCampaignStatus(campaignId, 'sent');
      await recordCampaignAction({
        campaign_id: campaignId,
        action: 'completed',
        changed_by: userId,
        metadata: {
          totalSent,
          totalFailed,
          totalSkipped,
        },
      });

      console.log(
        `[campaign-engine] Campaign ${campaignId} completed: ${totalSent} sent, ${totalFailed} failed.`,
      );
    }

    // 6. Increment monthly usage (campaign type)
    if (totalSent > 0) {
      await incrementUsage('campaign', totalSent).catch((err) => {
        console.error('[campaign-engine] Failed to increment usage:', err);
      });
    }
  } catch (err) {
    // Unrecoverable error — mark campaign as failed
    const errorMessage = err instanceof Error ? err.message : 'Unknown engine error';
    console.error(`[campaign-engine] Fatal error processing campaign ${campaignId}:`, err);

    await updateCampaignStatus(campaignId, 'failed').catch(() => {});
    await recordCampaignAction({
      campaign_id: campaignId,
      action: 'failed',
      changed_by: userId,
      notes: errorMessage,
      metadata: {
        totalSent,
        totalFailed,
        totalSkipped,
        error: errorMessage,
      },
    }).catch(() => {});

    throw err; // Re-throw so the caller knows processing failed
  }

  return { sent: totalSent, failed: totalFailed, skipped: totalSkipped, stopped };
}

// ---------------------------------------------------------------------------
// Chunked processing (for cron context with limited execution time)
// ---------------------------------------------------------------------------

export interface ProcessCampaignChunkResult {
  processed: number;
  remaining: number;
  completed: boolean;
}

/**
 * Process a limited chunk of campaign recipients.
 * Designed for cron context where execution time is limited.
 *
 * Pre-conditions:
 * - Campaign must already be in `'sending'` status.
 * - Recipients must already be populated.
 *
 * @returns `{ processed, remaining, completed }` — completed is true when
 *   all recipients have been processed and the campaign is marked 'sent'.
 */
export async function processCampaignChunk(
  campaignId: string,
  userId: string,
  chunkSize: number,
): Promise<ProcessCampaignChunkResult> {
  // 1. Load & validate campaign
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found.`);
  }
  if (campaign.status !== 'sending') {
    throw new Error(
      `Campaign ${campaignId} is in '${campaign.status}' status — expected 'sending'.`,
    );
  }

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  try {
    // 2. Build A/B variant map (empty if no A/B test)
    const variantMap = await buildVariantMap(campaignId);

    // 3. Fetch a single batch of chunkSize recipients
    const batch = await getNextBatch(campaignId, chunkSize);

    for (const recipient of batch) {
      // Check unsubscribe status before sending
      const unsubscribed = await isUnsubscribed(recipient.email);
      if (unsubscribed) {
        await markRecipientSkipped(recipient.id, 'Отписан от имейли');
        totalSkipped++;
        continue;
      }

      // Resolve A/B variant (if any)
      const variant = recipient.variant_id
        ? variantMap.get(recipient.variant_id) ?? null
        : null;

      const success = await processRecipient(campaign, recipient, variant);
      if (success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    // Increment counters atomically after the chunk
    if (totalSent > 0 || totalFailed > 0) {
      await incrementCampaignCounters(campaignId, totalSent, totalFailed);
    }

    // Increment monthly usage
    if (totalSent > 0) {
      await incrementUsage('campaign', totalSent).catch((err) => {
        console.error('[campaign-engine] Failed to increment usage:', err);
      });
    }

    console.log(
      `[campaign-engine] Chunk complete: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (campaign ${campaignId})`,
    );

    // 4. Check remaining pending recipients
    const stats = await getRecipientStats(campaignId);
    const remaining = stats.pending;

    // 5. If no more pending → mark campaign as 'sent'
    if (remaining === 0) {
      await updateCampaignStatus(campaignId, 'sent');
      await recordCampaignAction({
        campaign_id: campaignId,
        action: 'completed',
        changed_by: userId,
        metadata: {
          totalSent,
          totalFailed,
          totalSkipped,
          processedVia: 'cron-chunk',
        },
      });

      console.log(
        `[campaign-engine] Campaign ${campaignId} completed via chunked processing.`,
      );

      return { processed: totalSent + totalFailed + totalSkipped, remaining: 0, completed: true };
    }

    return { processed: totalSent + totalFailed + totalSkipped, remaining, completed: false };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown engine error';
    console.error(`[campaign-engine] Fatal error in chunk processing for campaign ${campaignId}:`, err);

    await updateCampaignStatus(campaignId, 'failed').catch(() => {});
    await recordCampaignAction({
      campaign_id: campaignId,
      action: 'failed',
      changed_by: userId,
      notes: errorMessage,
      metadata: {
        totalSent,
        totalFailed,
        totalSkipped,
        error: errorMessage,
        processedVia: 'cron-chunk',
      },
    }).catch(() => {});

    throw err;
  }
}
