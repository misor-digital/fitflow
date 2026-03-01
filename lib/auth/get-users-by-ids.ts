/**
 * Batch-fetch auth user emails by IDs via a single RPC call.
 *
 * Uses the `get_user_emails_by_ids` Postgres function (SECURITY DEFINER)
 * which queries `auth.users` inside the DB — no need for PostgREST to
 * expose the `auth` schema.
 *
 * Falls back to sequential `getUserById` calls if the RPC is not yet
 * deployed (e.g. migration hasn't been applied).
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Fetch a map of userId → email for a batch of user IDs.
 * Single DB round-trip via RPC `get_user_emails_by_ids`.
 */
export async function getUserEmailsByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  if (ids.length === 0) return emailMap;

  // Primary path: single RPC call into auth.users via SECURITY DEFINER function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)('get_user_emails_by_ids', { user_ids: ids });

  if (!error && data) {
    for (const row of data as unknown as Array<{ id: string; email: string }>) {
      if (row.email) {
        emailMap.set(row.id, row.email);
      }
    }
    return emailMap;
  }

  // Fallback: sequential getUserById (N+1 but at least works)
  console.warn(
    '[getUserEmailsByIds] RPC get_user_emails_by_ids failed, falling back to sequential getUserById:',
    error?.message,
  );

  await Promise.all(
    ids.map(async (uid) => {
      try {
        const { data: authUser } =
          await supabaseAdmin.auth.admin.getUserById(uid);
        if (authUser?.user?.email) {
          emailMap.set(uid, authUser.user.email);
        }
      } catch {
        // Non-fatal
      }
    }),
  );

  return emailMap;
}
