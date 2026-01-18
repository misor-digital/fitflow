/**
 * Server-side Authentication Utilities
 * 
 * These utilities are for use in Server Components, Server Actions, and API Routes.
 * They provide session management and role-based authorization.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { UserRole, UserWithRoles, SessionInfo } from './types';

/**
 * Create a Supabase client for server-side use with cookie-based sessions
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get user roles from the database
 * Uses session client with RLS policy allowing users to read their own roles
 */
async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return (data || []).map((row: { role: UserRole }) => row.role);
}

/**
 * Get the current session with user roles
 * Cached per request to avoid multiple database calls
 */
export const getSession = cache(async (): Promise<SessionInfo> => {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
    };
  }

  // Fetch user roles
  const roles = await getUserRoles(user.id);

  const userWithRoles: UserWithRoles = {
    ...user,
    roles,
  };

  return {
    user: userWithRoles,
    isAuthenticated: true,
    isAdmin: roles.includes('admin'),
  };
});

/**
 * Require authentication
 * Throws an error if the user is not authenticated
 */
export async function requireAuth(): Promise<UserWithRoles> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.user) {
    throw new Error('Authentication required');
  }

  return session.user;
}

/**
 * Require admin role
 * Throws an error if the user is not an admin
 */
export async function requireAdmin(): Promise<UserWithRoles> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.user) {
    throw new Error('Authentication required');
  }

  if (!session.isAdmin) {
    throw new Error('Admin role required');
  }

  return session.user;
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getSession();

  if (!session.user) {
    return false;
  }

  return session.user.roles.includes(role);
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Validate password against requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
