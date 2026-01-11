/**
 * Logout API Route
 * 
 * Handles user logout and session cleanup.
 */

import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import { logUserAction } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/audit/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user before logout for audit log
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Log logout action
      await logUserAction(user.id, AUDIT_ACTIONS.USER_LOGOUT);
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
