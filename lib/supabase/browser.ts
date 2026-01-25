/**
 * Supabase Browser Client
 * 
 * Client-side Supabase client for use in React components.
 * Uses localStorage for session persistence (browser default).
 * 
 * For customer auth, the actual session is stored in httpOnly cookies
 * via the server client, but this client can still access the session
 * for client-side operations.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Create a Supabase client for browser-side operations
 * 
 * This client:
 * - Works with the cookie-based session set by the server
 * - Can be used in client components
 * - Automatically syncs with server session
 * 
 * @returns Supabase client for browser use
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
