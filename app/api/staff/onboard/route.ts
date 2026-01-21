/**
 * API Route: Staff Onboarding
 * POST /api/staff/onboard
 * Sets password for new staff user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, token } = body;

    if (!password || !token) {
      return NextResponse.json(
        { error: 'Password and token are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Verify the magic link token
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.user) {
      return NextResponse.json(
        { error: 'Invalid or expired onboarding link' },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      verifyData.user.id,
      { password }
    );

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      );
    }

    // Clear requires_password_reset flag
    await supabase
      .from('staff_users')
      .update({ requires_password_reset: false })
      .eq('user_id', verifyData.user.id);

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    console.error('Error in staff onboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
