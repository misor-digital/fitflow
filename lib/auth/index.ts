/**
 * Authentication middleware and helpers for API routes
 * 
 * Provides utilities for protecting API endpoints with authentication
 * and authorization checks.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabase as adminClient } from '@/lib/supabase/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  userType: 'admin' | 'client';
  role: string;
  isActive: boolean;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}

/**
 * Create a server-side Supabase client for API routes
 */
async function createApiSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Ignore errors in API routes
        }
      },
    },
  });
}

/**
 * Require authentication for an API route
 * Returns 401 if not authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createApiSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  // Get user profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileError } = await (adminClient as any)
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'User profile not found' },
        { status: 401 }
      ),
    };
  }

  if (!profile.is_active) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      id: profile.id as string,
      email: profile.email as string,
      name: profile.name as string | null,
      userType: profile.user_type as 'admin' | 'client',
      role: profile.role as string,
      isActive: profile.is_active as boolean,
    },
    error: null,
  };
}

/**
 * Require admin authentication for an API route
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdminAuth(): Promise<AuthResult> {
  const result = await requireAuth();
  
  if (result.error) {
    return result;
  }

  if (result.user!.userType !== 'admin') {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Require specific admin role for an API route
 * Returns 401 if not authenticated, 403 if not authorized
 */
export async function requireAdminRoleAuth(allowedRoles: string[]): Promise<AuthResult> {
  const result = await requireAdminAuth();
  
  if (result.error) {
    return result;
  }

  if (!allowedRoles.includes(result.user!.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: `Forbidden - Required role: ${allowedRoles.join(' or ')}` },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}
