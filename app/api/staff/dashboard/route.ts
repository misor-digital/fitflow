/**
 * API Route: Staff Dashboard Data
 * GET /api/staff/dashboard
 * Returns staff user data with roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get staff user with roles
    const { data: staffUser, error: staffError } = await supabase
      .from('staff_users')
      .select(`
        id,
        full_name,
        email,
        is_active
      `)
      .eq('user_id', user.id)
      .single();

    if (staffError || !staffUser) {
      return NextResponse.json(
        { error: 'Staff user not found' },
        { status: 404 }
      );
    }

    if (!staffUser.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Get roles
    const { data: roleAssignments } = await supabase
      .from('staff_role_assignments')
      .select(`
        roles (
          name,
          description
        )
      `)
      .eq('staff_user_id', staffUser.id);

    const roles = (roleAssignments || []).map((assignment: any) => ({
      name: assignment.roles.name,
      description: assignment.roles.description,
    }));

    return NextResponse.json({
      success: true,
      staffUser: {
        full_name: staffUser.full_name,
        email: staffUser.email,
        roles,
      },
    });
  } catch (error) {
    console.error('Error in staff dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
