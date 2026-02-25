import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Check if the current user has a password set.
 * Users who signed up via magic link may not have one.
 */
export async function GET(): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check auth.users for password presence
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(session.userId);

  // If user has encrypted_password set and it's not empty, they have a password
  const hasPassword = Boolean(
    user?.user?.user_metadata?.has_password ??
    // Fallback: try to detect from identities
    user?.user?.identities?.some(i => i.provider === 'email')
  );

  return NextResponse.json({ hasPassword });
}
