/**
 * Server-side Supabase client for authentication
 * 
 * This module provides server-side auth utilities for:
 * - Server components
 * - API routes
 * - Server actions
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';
import { supabase as adminClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  userType: 'admin' | 'client';
  role: string;
  isActive: boolean;
}

/**
 * Create a server-side Supabase client with cookie handling
 * Use this in server components and API routes
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  return createServerClient<Database>(supabaseUrl, supabaseSecretKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

/**
 * Get the current authenticated user from the server
 * Returns null if not authenticated
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current user's profile from the database
 * Returns null if not authenticated or profile not found
 */
export async function getServerUserProfile(): Promise<UserProfile | null> {
  const user = await getServerUser();
  
  if (!user) {
    return null;
  }

  // Use admin client to bypass RLS for profile lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (adminClient as any)
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id as string,
    email: profile.email as string,
    name: profile.name as string | null,
    userType: profile.user_type as 'admin' | 'client',
    role: profile.role as string,
    isActive: profile.is_active as boolean,
  };
}

/**
 * Check if the current user is an authenticated admin
 * Returns the profile if admin, null otherwise
 */
export async function requireAdmin(): Promise<UserProfile | null> {
  const profile = await getServerUserProfile();
  
  if (!profile) {
    return null;
  }

  if (profile.userType !== 'admin' || !profile.isActive) {
    return null;
  }

  return profile;
}

/**
 * Check if the current user has a specific admin role
 */
export async function requireAdminRole(allowedRoles: string[]): Promise<UserProfile | null> {
  const profile = await requireAdmin();
  
  if (!profile) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return null;
  }

  return profile;
}
