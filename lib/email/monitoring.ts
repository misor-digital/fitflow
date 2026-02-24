/**
 * Email System Monitoring
 *
 * Health check and monitoring utilities for the email system.
 * Used by cron processors and the admin dashboard.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateMonthUsage } from '@/lib/data/email-usage';
import type { EmailSendLogRow } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailSystemHealth {
  status: 'healthy' | 'warning' | 'error';
  pendingCampaigns: number;
  sendingCampaigns: number;
  scheduledCampaigns: number;
  stalledCampaigns: number;
  monthlyUsage: {
    sent: number;
    limit: number;
    percentage: number;
  };
  recentErrorCount: number;
  lastWebhookAt: string | null;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Returns a comprehensive health snapshot of the email system.
 * Used by the admin dashboard health widget and health check API.
 */
export async function getSystemHealth(): Promise<EmailSystemHealth> {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    usage,
    sendingResult,
    scheduledResult,
    stalledResult,
    errorResult,
    webhookResult,
  ] = await Promise.all([
    getOrCreateMonthUsage(),

    // Sending campaigns count
    supabaseAdmin
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sending'),

    // Scheduled campaigns count
    supabaseAdmin
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled'),

    // Stalled campaigns (sending + updated_at > 2h ago)
    supabaseAdmin
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sending')
      .lt('updated_at', staleThreshold),

    // Recent error count (last 24h)
    supabaseAdmin
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', last24h),

    // Last webhook event (most recent log with webhook data)
    supabaseAdmin
      .from('email_send_log')
      .select('delivered_at, opened_at, clicked_at')
      .not('delivered_at', 'is', null)
      .order('delivered_at', { ascending: false })
      .limit(1),
  ]);

  const sendingCount = sendingResult.count ?? 0;
  const scheduledCount = scheduledResult.count ?? 0;
  const stalledCount = stalledResult.count ?? 0;
  const recentErrorCount = errorResult.count ?? 0;

  // Determine last webhook timestamp
  const webhookRow = webhookResult.data?.[0];
  const lastWebhookAt = webhookRow?.delivered_at ?? webhookRow?.opened_at ?? webhookRow?.clicked_at ?? null;

  // Usage percentage
  const usagePercentage = usage.monthly_limit > 0
    ? Math.round((usage.total_sent / usage.monthly_limit) * 100)
    : 0;

  // Determine overall status
  let status: EmailSystemHealth['status'] = 'healthy';

  if (stalledCount > 0 || recentErrorCount > 10 || usagePercentage >= 95) {
    status = 'error';
  } else if (recentErrorCount > 0 || usagePercentage >= 85) {
    status = 'warning';
  }

  return {
    status,
    pendingCampaigns: scheduledCount,
    sendingCampaigns: sendingCount,
    scheduledCampaigns: scheduledCount,
    stalledCampaigns: stalledCount,
    monthlyUsage: {
      sent: usage.total_sent,
      limit: usage.monthly_limit,
      percentage: usagePercentage,
    },
    recentErrorCount,
    lastWebhookAt,
  };
}

// ---------------------------------------------------------------------------
// Recent errors
// ---------------------------------------------------------------------------

/**
 * Fetch recent failed email sends for admin review.
 */
export async function getRecentErrors(
  limit: number = 20,
): Promise<EmailSendLogRow[]> {
  const { data, error } = await supabaseAdmin
    .from('email_send_log')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[monitoring] Error fetching recent errors:', error);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Usage limit check
// ---------------------------------------------------------------------------

/**
 * Returns true if monthly usage exceeds the given threshold percentage.
 * Default threshold is 85%.
 */
export async function isNearMonthlyLimit(
  threshold: number = 85,
): Promise<boolean> {
  const usage = await getOrCreateMonthUsage();
  if (usage.monthly_limit <= 0) return false;

  const percentage = (usage.total_sent / usage.monthly_limit) * 100;
  return percentage >= threshold;
}
