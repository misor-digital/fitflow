import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Admin Supabase client using the secret key.
 * Bypasses RLS — use ONLY for:
 * - Server-side data access that doesn't need per-user auth (catalog, promo, etc.)
 * - Admin operations (user management, bulk queries)
 * - Background jobs
 *
 * NEVER import this in client components.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'
  );
}

export const supabaseAdmin = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Cap every Supabase request so a Supabase outage doesn't stall
      // page renders for the default TCP connect timeout.
      // 8 s is long enough for cold-start queries but short enough to
      // fail fast when the DB is genuinely unreachable.
      fetch: (url: RequestInfo | URL, init?: RequestInit) => {
        const timeoutSignal = AbortSignal.timeout(8_000);
        // Compose with any signal the caller already attached (e.g.
        // supabase-js subscriptions) so we respect both.
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
        return fetch(url, { ...init, signal });
      },
    },
  }
);
