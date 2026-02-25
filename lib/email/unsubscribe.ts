/**
 * Unsubscribe Management
 *
 * Handles unsubscribe events from Brevo webhooks and manual admin actions.
 * Checks unsubscribe status before sending campaign emails.
 *
 * Design decisions:
 * - Single global unsubscribe list — covers all campaign types.
 * - Transactional emails (order confirmation, etc.) are NOT affected.
 * - Re-subscribe requires admin action (compliance).
 * - Upsert on insert to handle duplicate unsubscribe events gracefully.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailUnsubscribeRow } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Record unsubscribe
// ---------------------------------------------------------------------------

/**
 * Record an unsubscribe event. Uses upsert (ON CONFLICT email DO UPDATE)
 * so duplicate events don't cause errors.
 */
export async function recordUnsubscribe(
  email: string,
  source: string,
  campaignId?: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_unsubscribes')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        source,
        campaign_id: campaignId ?? null,
        reason: reason ?? null,
        unsubscribed_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    );

  if (error) {
    console.error('Error recording unsubscribe:', error);
    throw new Error('Failed to record unsubscribe.');
  }

  console.log(`[unsubscribe] Recorded unsubscribe for ${email} (source: ${source})`);
}

// ---------------------------------------------------------------------------
// Check status
// ---------------------------------------------------------------------------

/**
 * Check if an email address is in the unsubscribe list.
 */
export async function isUnsubscribed(email: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('email_unsubscribes')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.toLowerCase().trim());

  if (error) {
    console.error('Error checking unsubscribe status:', error);
    // Fail open — don't block sending on a check error
    return false;
  }

  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

/**
 * Get paginated list of unsubscribed emails for admin view.
 */
export async function getUnsubscribes(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<{ data: EmailUnsubscribeRow[]; total: number }> {
  const { page, limit, search } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('email_unsubscribes')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data, error, count } = await query
    .order('unsubscribed_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching unsubscribes:', error);
    throw new Error('Failed to fetch unsubscribes.');
  }

  return { data: data ?? [], total: count ?? 0 };
}

/**
 * Get total unsubscribe count.
 */
export async function getUnsubscribeCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('email_unsubscribes')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting unsubscribes:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Remove an email from the unsubscribe list (re-subscribe).
 * Requires admin action — logged for audit purposes.
 */
export async function removeUnsubscribe(
  email: string,
  _adminId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_unsubscribes')
    .delete()
    .eq('email', email.toLowerCase().trim());

  if (error) {
    console.error('Error removing unsubscribe:', error);
    throw new Error('Failed to remove unsubscribe.');
  }

  console.log(`[unsubscribe] Removed unsubscribe for ${email} (admin re-subscribe)`);
}

/**
 * Count unsubscribed recipients for a specific campaign.
 * Counts recipients with status 'skipped' whose error contains unsubscribe reason.
 */
export async function getCampaignUnsubscribeCount(
  campaignId: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'skipped')
    .ilike('error', '%Отписан%');

  if (error) {
    console.error('Error counting campaign unsubscribes:', error);
    return 0;
  }

  return count ?? 0;
}
