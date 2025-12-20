import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Use secret key for server-side operations (bypasses RLS)
// This should only be used in server-side code (API routes, server components)
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side client with secret key (bypasses RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
