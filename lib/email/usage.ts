/**
 * Email Usage Tracker
 *
 * Tracks monthly email send volume against the Brevo plan limit.
 * Starter plan: 5,000 emails/month, no daily cap.
 *
 * This module provides in-memory checks for fast path decisions.
 * Authoritative counts come from the email_monthly_usage table (Phase E1/E2).
 * Before the DB table exists, this module falls back to a no-op (always allows).
 */

const DEFAULT_MONTHLY_LIMIT = 5000;

export interface UsageCheck {
  canSend: boolean;
  remaining: number;
  used: number;
  limit: number;
  warningLevel: 'none' | 'approaching' | 'critical';
}

/**
 * Check if we can send N emails based on monthly usage.
 *
 * This is a lightweight check intended to be called before every send.
 * For Phase E0, it always returns true (no DB table yet).
 * Phase E2 will inject the real implementation via setUsageChecker().
 */
export type UsageChecker = (count: number) => Promise<UsageCheck>;

let usageChecker: UsageChecker | null = null;

export function setUsageChecker(checker: UsageChecker): void {
  usageChecker = checker;
}

export async function checkUsage(count: number = 1): Promise<UsageCheck> {
  if (usageChecker) {
    return usageChecker(count);
  }

  // Fallback: no DB — always allow, unknown usage
  return {
    canSend: true,
    remaining: DEFAULT_MONTHLY_LIMIT,
    used: 0,
    limit: DEFAULT_MONTHLY_LIMIT,
    warningLevel: 'none',
  };
}

/**
 * Determine warning level based on usage percentage
 */
export function getWarningLevel(used: number, limit: number): UsageCheck['warningLevel'] {
  const pct = used / limit;
  if (pct >= 0.95) return 'critical';
  if (pct >= 0.80) return 'approaching';
  return 'none';
}
