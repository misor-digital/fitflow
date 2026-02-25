/**
 * Email Campaign History (Audit Trail) Data Access Layer
 *
 * Follows the pattern of order_status_history and subscription_history.
 * Records every campaign state change with who, when, and context.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  EmailCampaignHistoryRow,
  EmailCampaignHistoryInsert,
} from '@/lib/supabase/types';

// ============================================================================
// Write operations
// ============================================================================

/**
 * Insert a campaign history (audit) row.
 * Called by campaign lifecycle methods for every state change.
 */
export async function recordCampaignAction(
  data: EmailCampaignHistoryInsert,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaign_history')
    .insert(data);

  if (error) {
    console.error('Error recording campaign action:', error);
    // Non-fatal — the campaign operation itself succeeded
  }
}

// ============================================================================
// Read operations (cached)
// ============================================================================

/**
 * Get full history for a campaign, ordered by created_at ASC.
 * Used by admin detail view.
 */
export const getCampaignHistory = cache(
  async (campaignId: string): Promise<EmailCampaignHistoryRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('email_campaign_history')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching campaign history:', error);
      throw new Error('Failed to fetch campaign history.');
    }

    return data ?? [];
  },
);
