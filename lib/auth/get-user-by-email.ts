/**
 * Lookup a single auth user by email via the service-role client.
 *
 * The Supabase JS admin API does not expose an email-filter param on
 * `listUsers()`.  Calling listUsers() therefore fetches ALL users — an
 * O(n) operation that degrades as the user base grows.
 *
 * This helper queries the `auth.users` table directly through PostgREST
 * (accessible with the service-role key) so we get a single-row lookup
 * at effectively O(1) cost.
 *
 * Usage:
 * ```ts
 * const user = await getUserByEmail('test@example.com');
 * ```
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AuthUserLookup {
  id: string;
  email: string;
  raw_user_meta_data: Record<string, unknown>;
}

/**
 * Retrieve a single auth user by their email address.
 * Returns null when no match is found.
 *
 * Falls back to the admin `listUsers` approach if the direct query fails
 * (e.g. because the connected Supabase project restricts `auth.users`).
 */
export async function getUserByEmail(
  email: string,
): Promise<AuthUserLookup | null> {
  // Primary path: query auth.users via PostgREST  
  // Service-role key has access to the auth schema
  const { data, error } = await supabaseAdmin
    .schema('auth' as 'public')      // cast required — typed only for 'public'
    .from('users')
    .select('id, email, raw_user_meta_data')
    .eq('email', email.toLowerCase())
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return data as unknown as AuthUserLookup;
  }

  // Fallback: use admin API (fetches first page and scans)
  if (error) {
    console.warn(
      '[getUserByEmail] Direct auth.users query failed, falling back to listUsers:',
      error.message,
    );
  }

  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    const match = listData?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return {
        id: match.id,
        email: match.email ?? email,
        raw_user_meta_data: (match.user_metadata ?? {}) as Record<string, unknown>,
      };
    }
  } catch {
    // non-fatal
  }

  return null;
}
