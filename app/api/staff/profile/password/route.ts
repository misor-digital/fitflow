/**
 * Staff Password Change API Route
 * POST - Change current user's password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    
    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }
    
    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    // Clear requires_password_reset flag if set
    await supabase
      .from('staff_users')
      .update({ requires_password_reset: false } as any)
      .eq('user_id', user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
