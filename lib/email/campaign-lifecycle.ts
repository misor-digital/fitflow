/**
 * Campaign Lifecycle Management
 *
 * Validates and performs state transitions with full audit logging.
 * Every status change is guarded by the transition map and recorded
 * in the email_campaign_history table.
 */

import 'server-only';

import {
  updateCampaignStatus,
  getCampaignById,
  updateCampaign,
  createCampaign,
} from '@/lib/data/email-campaigns';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';
import { getRecipientStats } from '@/lib/data/email-recipients';
import { processCampaign } from './campaign-engine';
import { assignRecipientsToVariants, getABVariants } from './ab-testing';
import {
  buildSubscriberRecipients,
  buildCustomerRecipients,
} from './recipient-builder';
import type { EmailCampaignStatusEnum, EmailCampaignRow } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Transition map
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<EmailCampaignStatusEnum, EmailCampaignStatusEnum[]> = {
  draft: ['scheduled', 'sending', 'cancelled'],
  scheduled: ['sending', 'cancelled', 'draft'],
  sending: ['paused', 'sent', 'failed', 'cancelled'],
  paused: ['sending', 'cancelled'],
  sent: [],       // terminal
  cancelled: [],  // terminal
  failed: [],     // terminal
};

/**
 * Throws if the transition is not allowed.
 */
function validateTransition(
  from: EmailCampaignStatusEnum,
  to: EmailCampaignStatusEnum,
): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid campaign transition: ${from} → ${to}`);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle functions
// ---------------------------------------------------------------------------

/**
 * Start a campaign (draft / scheduled → sending).
 *
 * Sets `started_at`, snapshots `total_recipients`, and records a 'started'
 * audit entry. Then kicks off `processCampaign()`.
 */
export async function startCampaign(
  campaignId: string,
  userId: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'sending');

  // Snapshot total recipient count
  const stats = await getRecipientStats(campaignId);
  const totalRecipients =
    stats.pending + stats.sent + stats.delivered + stats.opened +
    stats.clicked + stats.bounced + stats.failed + stats.skipped;

  // Transition to 'sending' (DAL auto-sets started_at)
  await updateCampaignStatus(campaignId, 'sending', {
    total_recipients: totalRecipients,
  });

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'started',
    changed_by: userId,
    metadata: {
      totalRecipients,
      previousStatus: campaign.status,
      targetFilter: campaign.target_filter,
    },
  });

  // Assign recipients to A/B variants (if configured)
  const variants = await getABVariants(campaignId);
  if (variants.length > 0) {
    await assignRecipientsToVariants(campaignId);
    console.log(`[campaign-lifecycle] A/B variants assigned for campaign ${campaignId}`);
  }

  // Process recipients
  await processCampaign(campaignId, userId);
}

/**
 * Schedule a campaign for future sending (draft → scheduled).
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: string,
  userId: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'scheduled');

  await updateCampaign(campaignId, {
    status: 'scheduled',
    scheduled_at: scheduledAt,
    updated_by: userId,
  });

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'scheduled',
    changed_by: userId,
    metadata: { scheduledAt },
  });
}

/**
 * Pause a running campaign (sending → paused).
 *
 * The engine checks status between batches and will stop when it
 * sees the campaign is no longer 'sending'.
 */
export async function pauseCampaign(
  campaignId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'paused');

  const stats = await getRecipientStats(campaignId);

  await updateCampaignStatus(campaignId, 'paused');

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'paused',
    changed_by: userId,
    notes: reason,
    metadata: {
      reason: reason ?? null,
      sentSoFar: stats.sent + stats.delivered + stats.opened + stats.clicked,
      remainingRecipients: stats.pending,
    },
  });
}

/**
 * Resume a paused campaign (paused → sending).
 *
 * Transitions status back to 'sending' and re-enters `processCampaign()`
 * which will pick up remaining pending recipients.
 */
export async function resumeCampaign(
  campaignId: string,
  userId: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'sending');

  await updateCampaignStatus(campaignId, 'sending');

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'resumed',
    changed_by: userId,
  });

  // Continue processing remaining recipients
  await processCampaign(campaignId, userId);
}

/**
 * Cancel a campaign from any active (non-terminal) status.
 */
export async function cancelCampaign(
  campaignId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'cancelled');

  const stats = await getRecipientStats(campaignId);
  const sentBeforeCancel =
    stats.sent + stats.delivered + stats.opened + stats.clicked;

  await updateCampaignStatus(campaignId, 'cancelled');

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'cancelled',
    changed_by: userId,
    notes: reason,
    metadata: {
      reason: reason ?? null,
      sentBeforeCancel,
      remainingRecipients: stats.pending,
      previousStatus: campaign.status,
    },
  });
}

/**
 * Mark a campaign as completed.
 *
 * Called by the engine when all recipients have been processed.
 * Sets `completed_at` and records a 'completed' audit entry with final stats.
 */
export async function completeCampaign(
  campaignId: string,
  userId: string,
): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

  validateTransition(campaign.status, 'sent');

  const stats = await getRecipientStats(campaignId);

  // updateCampaignStatus auto-sets completed_at for 'sent'
  await updateCampaignStatus(campaignId, 'sent');

  await recordCampaignAction({
    campaign_id: campaignId,
    action: 'completed',
    changed_by: userId,
    metadata: {
      sent: stats.sent + stats.delivered + stats.opened + stats.clicked,
      failed: stats.failed,
      skipped: stats.skipped,
      bounced: stats.bounced,
    },
  });
}

// ---------------------------------------------------------------------------
// Campaign duplication
// ---------------------------------------------------------------------------

/**
 * Duplicate a campaign — creates a new draft campaign with the same settings,
 * audience filter, template, and params. Recipients are re-populated from the filter.
 * A/B test config is NOT duplicated (must be re-created).
 */
export async function duplicateCampaign(
  campaignId: string,
  userId: string,
): Promise<EmailCampaignRow> {
  const original = await getCampaignById(campaignId);
  if (!original) throw new Error(`Campaign ${campaignId} not found.`);

  // Create new draft campaign with "[Копие] {originalName}" naming
  const newCampaign = await createCampaign({
    name: `[Копие] ${original.name}`,
    subject: original.subject,
    campaign_type: original.campaign_type,
    target_list_type: original.target_list_type,
    template_id: original.template_id,
    target_filter: original.target_filter,
    params: original.params,
    created_by: userId,
  });

  // Re-populate recipients from the filter
  let recipientCount = 0;

  switch (original.campaign_type) {
    case 'lifecycle':
      recipientCount = await buildSubscriberRecipients(
        newCampaign.id,
        original.target_filter as never,
      );
      break;
    case 'promotional':
      recipientCount = await buildCustomerRecipients(
        newCampaign.id,
        original.target_filter as never,
      );
      break;
    // 'one-off' — no auto-population
  }

  // Update total_recipients
  if (recipientCount > 0) {
    await updateCampaign(newCampaign.id, {
      total_recipients: recipientCount,
      updated_by: userId,
    });
  }

  // Audit log
  await recordCampaignAction({
    campaign_id: newCampaign.id,
    action: 'duplicated',
    changed_by: userId,
    metadata: {
      originalCampaignId: original.id,
      originalName: original.name,
      recipientCount,
    },
    notes: `Дублирана от „${original.name}"`,
  });

  return { ...newCampaign, total_recipients: recipientCount };
}
