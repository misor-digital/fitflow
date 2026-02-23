import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Browser-side Supabase client for use in 'use client' components.
 * Uses the publishable key — safe for browser exposure.
 * Handles auth cookies automatically.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}
