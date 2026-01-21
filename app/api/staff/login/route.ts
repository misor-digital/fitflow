/**
 * API Route: Staff Login
 * POST /api/staff/login
 * Authenticates staff user and returns session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 2. Check if user is staff
    const { data: staffUser, error: staffError } = await supabase
      .from('staff_users')
      .select('id, is_active, requires_password_reset')
      .eq('user_id', authData.user.id)
      .single();

    if (staffError || !staffUser) {
      // Not a staff user - sign them out
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Access denied: Not a staff user' },
        { status: 403 }
      );
    }

    // 3. Check if staff account is active
    if (!staffUser.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // 4. Update last_login_at
    await supabase
      .from('staff_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', staffUser.id);

    // 5. Return success with session and flags
    return NextResponse.json({
      success: true,
      session: authData.session,
      requiresPasswordReset: staffUser.requires_password_reset,
    });
  } catch (error) {
    console.error('Error in staff login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
