import 'server-only';
import { cache } from 'react';
import { forbidden, unauthorized } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { UserProfileRow, UserType, StaffRole } from '@/lib/supabase/types';

// ============================================================================
// Session Verification (cached per request)
// ============================================================================

export interface AuthSession {
  userId: string;
  email: string;
  profile: UserProfileRow;
}

/**
 * Verify the current session and return user + profile data.
 * Uses getClaims() — validates JWT signature without a network call.
 * Returns null if no valid session exists (not an error).
 * 
 * Cached per-request via React.cache() — safe to call multiple times
 * in the same request without redundant work.
 */
export const verifySession = cache(async (): Promise<AuthSession | null> => {
  const supabase = await createClient();

  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims?.sub) {
    return null;
  }

  const { claims } = data;
  const userId = claims.sub;
  const email = (claims as { email?: string }).email ?? '';

  // Fetch profile from admin client (bypasses RLS for reliability)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return { userId, email, profile };
});

// ============================================================================
// Authorization Enforcers
// ============================================================================

/**
 * Require an authenticated user. Calls unauthorized() if no session.
 * Use in page components and route handlers that need a logged-in user.
 * 
 * Next.js unauthorized() renders the closest unauthorized.tsx boundary
 * or returns a 401 response.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await verifySession();
  if (!session) {
    unauthorized();
  }
  return session;
}

/**
 * Require a staff user with one of the allowed roles.
 * Calls forbidden() if the user is not staff or lacks the required role.
 * 
 * Next.js forbidden() renders the closest forbidden.tsx boundary
 * or returns a 403 response.
 * 
 * @param allowedRoles - Specific staff roles allowed. If empty, any staff role is accepted.
 */
export async function requireStaff(
  allowedRoles: StaffRole[] = []
): Promise<AuthSession> {
  const session = await requireAuth();

  if (session.profile.user_type !== 'staff') {
    forbidden();
  }

  if (allowedRoles.length > 0 && session.profile.staff_role) {
    if (!allowedRoles.includes(session.profile.staff_role)) {
      forbidden();
    }
  }

  return session;
}

/**
 * Require a specific user type.
 * Calls forbidden() if the user doesn't match.
 */
export async function requireUserType(
  requiredType: UserType
): Promise<AuthSession> {
  const session = await requireAuth();

  if (session.profile.user_type !== requiredType) {
    forbidden();
  }

  return session;
}
