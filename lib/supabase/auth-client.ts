/**
 * Browser-side Supabase client for authentication
 * 
 * This client is used in client components for:
 * - User login/logout
 * - Session management
 * - Auth state changes
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get the browser-side Supabase client (singleton)
 * Safe to call multiple times - returns the same instance
 */
export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for browser client');
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = getSupabaseBrowserClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    return { session: null, error: error.message };
  }

  return { session, error: null };
}

/**
 * Get the current user
 */
export async function getUser() {
  const supabase = getSupabaseBrowserClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    return { user: null, error: error.message };
  }

  return { user, error: null };
}
