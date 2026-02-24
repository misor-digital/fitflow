/**
 * Email Campaign Recipients Data Access Layer
 *
 * Manage per-campaign recipient lists: bulk insert, batch fetching, status updates.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  EmailCampaignRecipientRow,
  EmailCampaignRecipientInsert,
  EmailRecipientStatusEnum,
} from '@/lib/supabase/types';

// ============================================================================
// Write operations
// ============================================================================

/**
 * Bulk insert recipients for a campaign.
 * Skips duplicates (same campaign_id + email) via upsert with
 * onConflict set to ignore. Returns the count of inserted rows.
 */
export async function addRecipients(
  recipients: EmailCampaignRecipientInsert[],
): Promise<number> {
  if (recipients.length === 0) return 0;

  // Use upsert with ignoreDuplicates to handle ON CONFLICT DO NOTHING
  const { data, error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .upsert(recipients, {
      onConflict: 'campaign_id,email',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) {
    console.error('Error adding recipients:', error);
    throw new Error('Failed to add recipients.');
  }

  return data?.length ?? 0;
}

/**
 * Mark a recipient as sent with the Brevo message ID.
 */
export async function markRecipientSent(
  id: string,
  brevoMessageId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .update({
      status: 'sent' as EmailRecipientStatusEnum,
      brevo_message_id: brevoMessageId,
      sent_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error marking recipient sent:', error);
    throw new Error('Failed to mark recipient as sent.');
  }
}

/**
 * Mark a recipient as failed with the error message.
 */
export async function markRecipientFailed(
  id: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .update({
      status: 'failed' as EmailRecipientStatusEnum,
      error: errorMessage,
    })
    .eq('id', id);

  if (error) {
    console.error('Error marking recipient failed:', error);
    throw new Error('Failed to mark recipient as failed.');
  }
}

/**
 * Mark a recipient as skipped with a reason.
 * Used for GDPR non-consent, unsubscribed, etc.
 */
export async function markRecipientSkipped(
  id: string,
  reason: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .update({
      status: 'skipped' as EmailRecipientStatusEnum,
      error: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('Error marking recipient skipped:', error);
    throw new Error('Failed to mark recipient as skipped.');
  }
}

/**
 * Update recipient status by Brevo message ID.
 * Used by the webhook handler to update delivery/open/click/bounce status.
 */
export async function updateRecipientStatus(
  brevoMessageId: string,
  status: EmailRecipientStatusEnum,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .update({ status })
    .eq('brevo_message_id', brevoMessageId);

  if (error) {
    console.error('Error updating recipient status:', error);
    throw new Error('Failed to update recipient status.');
  }
}

// ============================================================================
// Read operations
// ============================================================================

/**
 * Get the next batch of pending recipients for a campaign.
 * Ordered by created_at ASC for deterministic, fair processing order.
 */
export async function getNextBatch(
  campaignId: string,
  batchSize: number,
): Promise<EmailCampaignRecipientRow[]> {
  const { data, error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error('Error fetching next batch:', error);
    throw new Error('Failed to fetch next batch of recipients.');
  }

  return data ?? [];
}

/**
 * Aggregate COUNT of recipients grouped by status for a campaign.
 * Returns counts for all possible statuses.
 */
export async function getRecipientStats(
  campaignId: string,
): Promise<{
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  skipped: number;
}> {
  const statuses: EmailRecipientStatusEnum[] = [
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'skipped',
  ];

  const results: Record<string, number> = {};

  // Fetch counts per status in parallel
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabaseAdmin
        .from('email_campaign_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', status);

      if (error) {
        console.error(`Error counting ${status} recipients:`, error);
        return { status, count: 0 };
      }

      return { status, count: count ?? 0 };
    }),
  );

  for (const { status, count } of counts) {
    results[status] = count;
  }

  return {
    pending: results.pending ?? 0,
    sent: results.sent ?? 0,
    delivered: results.delivered ?? 0,
    opened: results.opened ?? 0,
    clicked: results.clicked ?? 0,
    bounced: results.bounced ?? 0,
    failed: results.failed ?? 0,
    skipped: results.skipped ?? 0,
  };
}

/**
 * Paginated recipient list for admin detail view.
 * Optional status filter.
 */
export async function getRecipientsPaginated(
  campaignId: string,
  page: number,
  perPage: number,
  statusFilter?: EmailRecipientStatusEnum,
): Promise<{ recipients: EmailCampaignRecipientRow[]; total: number }> {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .from('email_campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Error fetching recipients paginated:', error);
    throw new Error('Failed to fetch recipients.');
  }

  return { recipients: data ?? [], total: count ?? 0 };
}
