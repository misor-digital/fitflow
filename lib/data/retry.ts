import 'server-only';

/**
 * Retry an async function with exponential backoff.
 * Designed for transient Supabase errors (timeouts, network blips,
 * connection pool exhaustion, PostgREST 5xx).
 *
 * - 3 attempts total (1 initial + 2 retries)
 * - Backoff: 500ms → 1500ms (with jitter)
 * - Only retries on transient errors; permanent errors (e.g. missing table)
 *   are re-thrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTimeout =
        err instanceof DOMException && err.name === 'AbortError';
      const isNetworkError = err instanceof TypeError; // fetch() network failure
      const msg = err instanceof Error ? err.message : '';
      const isDbError = msg.includes('Failed to load') || msg.includes('Failed to fetch');
      const isRetryable = isTimeout || isNetworkError || isDbError;
      if (!isRetryable || i === attempts - 1) throw err;
      const delay = baseDelayMs * (i + 1) + Math.random() * baseDelayMs;
      await new Promise((r) => setTimeout(r, delay));
      console.warn(`[data] Retry ${i + 1}/${attempts - 1} after transient error:`, msg);
    }
  }
  throw lastError;
}
