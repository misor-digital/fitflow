/**
 * Staff Profile API Route
 * GET - Get current user's profile
 * PUT - Update current user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStaffUserWithRoles } from '@/lib/supabase/staffService';

const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
};

export async function GET(request: NextRequest) {
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
    
    // Get staff user with roles
    const staffUser = await getStaffUserWithRoles(user.id);
    
    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      profile: {
        id: staffUser.id,
        user_id: staffUser.user_id,
        full_name: staffUser.full_name,
        email: staffUser.email,
        is_active: staffUser.is_active,
        requires_password_reset: staffUser.requires_password_reset,
        last_login_at: staffUser.last_login_at,
        created_at: staffUser.created_at,
        roles: staffUser.roles,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { fullName } = body;
    
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }
    
    // Update staff_users table
    const { error: updateError } = await supabase
      .from('staff_users')
      .update({ full_name: fullName.trim() } as any)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    // Update auth.users metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName.trim(),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
