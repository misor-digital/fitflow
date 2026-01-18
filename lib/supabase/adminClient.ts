/**
 * Admin Supabase Client (Service Role)
 * 
 * This client uses the service role key and bypasses Row Level Security (RLS).
 * 
 * ⚠️ SECURITY WARNING:
 * - Only use this in server-side code (API routes, server actions, server components)
 * - Never use in middleware or edge runtime
 * - Never expose to client-side code
 * 
 * Use cases:
 * - Admin operations that need to bypass RLS
 * - Bulk data operations
 * - System-level tasks (audit logging, promo code management, catalog updates)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side admin client with service role key (bypasses RLS)
export const adminClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseSecretKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
