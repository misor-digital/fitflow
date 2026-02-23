import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Server-side Supabase client that reads/writes auth cookies.
 * Uses the publishable key — auth state comes from cookies, not the key.
 *
 * Must be called per-request (not cached as a singleton) because
 * it accesses the request-scoped cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from Server Component — ignore.
            // Cookies can only be set in Server Actions / Route Handlers.
          }
        },
      },
    }
  );
}
