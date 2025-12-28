import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Create a lazy-initialized client to avoid errors during client-side module evaluation
// The actual client is only created when first accessed (server-side only)
let _supabase: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set.'
    );
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return _supabase;
}

// Export a proxy that lazily initializes the client
// This prevents errors during client-side module evaluation
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient<Database>];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
