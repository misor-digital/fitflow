import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Check rate limit using Supabase-backed counter.
 * Returns true if the request is within limits.
 *
 * @param key - Unique identifier (e.g., "order:{ip}" or "promo:{ip}")
 * @param maxRequests - Max requests in the window
 * @param windowSeconds - Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return true; // Fail open — don't block requests if rate limiting fails
    }

    return data as boolean;
  } catch (err) {
    console.error('Rate limit error:', err);
    return true; // Fail open
  }
}
