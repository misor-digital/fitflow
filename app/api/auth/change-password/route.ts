/**
 * Change Password API Route
 * 
 * Handles password updates for authenticated users.
 * Frontend calls this API, API calls Supabase.
 */

import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import { validatePassword } from '@/lib/auth/server';
import { logUserAction } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/audit/types';

export async function POST(request: Request) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password requirements
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: `Password must contain: ${validation.errors.join(', ')}`,
          validationErrors: validation.errors
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    // Log password change
    await logUserAction(user.id, AUDIT_ACTIONS.USER_PASSWORD_CHANGE);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
