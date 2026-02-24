/**
 * Email Monthly Usage Data Access Layer
 *
 * Tracks monthly email volume against Brevo plan limits.
 * Starter plan: 5,000 emails/month, no daily cap.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailMonthlyUsageRow } from '@/lib/supabase/types';
import { getWarningLevel } from '@/lib/email/usage';
import type { UsageCheck } from '@/lib/email/usage';

const DEFAULT_MONTHLY_LIMIT = 5000;

// ============================================================================
// Read operations (cached)
// ============================================================================

/**
 * Get the current month's usage row, creating it if it doesn't exist.
 * Uses INSERT ... ON CONFLICT DO NOTHING then SELECT.
 */
export const getOrCreateMonthUsage = cache(
  async (): Promise<EmailMonthlyUsageRow> => {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // 'YYYY-MM-01' for DATE column

    // Try to insert (no-op if already exists)
    await supabaseAdmin
      .from('email_monthly_usage')
      .upsert(
        {
          month: currentMonth,
          transactional_sent: 0,
          campaign_sent: 0,
          monthly_limit: DEFAULT_MONTHLY_LIMIT,
          alert_sent_80: false,
          alert_sent_95: false,
        },
        { onConflict: 'month', ignoreDuplicates: true },
      );

    // Now select the row
    const { data, error } = await supabaseAdmin
      .from('email_monthly_usage')
      .select('*')
      .eq('month', currentMonth)
      .single();

    if (error || !data) {
      console.error('Error fetching month usage:', error);
      throw new Error('Failed to fetch monthly email usage.');
    }

    return data;
  },
);

/**
 * Last N months of usage data. For admin charts.
 */
export const getUsageHistory = cache(
  async (months: number): Promise<EmailMonthlyUsageRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('email_monthly_usage')
      .select('*')
      .order('month', { ascending: false })
      .limit(months);

    if (error) {
      console.error('Error fetching usage history:', error);
      throw new Error('Failed to fetch usage history.');
    }

    return data ?? [];
  },
);

// ============================================================================
// Write operations
// ============================================================================

/**
 * Increment usage counters atomically using the increment_email_usage RPC.
 * Returns current state after increment.
 */
export async function incrementUsage(
  type: 'transactional' | 'campaign',
  count: number,
): Promise<{ total: number; limit: number; isOverLimit: boolean }> {
  const { data, error } = await supabaseAdmin.rpc('increment_email_usage', {
    p_type: type,
    p_count: count,
  });

  if (error) {
    console.error('Error incrementing email usage:', error);
    throw new Error('Failed to increment email usage.');
  }

  // RPC returns an array with one row
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total: row.current_total,
    limit: row.current_limit,
    isOverLimit: row.is_over_limit,
  };
}

/**
 * Check if we can send N emails based on monthly usage.
 * This is the real implementation injected into setUsageChecker().
 */
export async function canSendEmails(count: number): Promise<UsageCheck> {
  try {
    const usage = await getOrCreateMonthUsage();
    const used = usage.total_sent;
    const limit = usage.monthly_limit;
    const remaining = Math.max(0, limit - used);

    return {
      canSend: used + count <= limit,
      remaining,
      used,
      limit,
      warningLevel: getWarningLevel(used, limit),
    };
  } catch {
    // Fallback: allow sending on usage check failure to avoid blocking emails
    console.error('Usage check failed — falling back to allow');
    return {
      canSend: true,
      remaining: DEFAULT_MONTHLY_LIMIT,
      used: 0,
      limit: DEFAULT_MONTHLY_LIMIT,
      warningLevel: 'none',
    };
  }
}

/**
 * Mark that a usage-threshold alert has been sent.
 * Prevents duplicate alerts for 80% and 95% thresholds.
 */
export async function markAlertSent(
  threshold: 80 | 95,
): Promise<void> {
  const field = threshold === 80 ? 'alert_sent_80' : 'alert_sent_95';
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  const { error } = await supabaseAdmin
    .from('email_monthly_usage')
    .update({ [field]: true })
    .eq('month', currentMonth);

  if (error) {
    console.error(`Error marking alert ${threshold}% sent:`, error);
    throw new Error(`Failed to mark ${threshold}% alert as sent.`);
  }
}
