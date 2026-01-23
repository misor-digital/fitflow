/**
 * API Route: Create Staff User
 * POST /api/staff/create
 * Creates a new staff user with roles (super_admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createStaffUser, isSuperAdmin } from '@/lib/supabase/staffService';
import { sendStaffOnboardingEmail } from '@/lib/email/staffEmails';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only super admins can create staff users' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, fullName, roleNames } = body;

    if (!email || !fullName || !roleNames || !Array.isArray(roleNames)) {
      return NextResponse.json(
        { error: 'Email, full name, and roles are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create staff user
    const result = await createStaffUser({
      email,
      fullName,
      roleNames,
      createdBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Generate onboarding URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const onboardingUrl = `${baseUrl}/staff/onboard?token=${result.onboardingToken}`;

    // Send onboarding email
    const emailSent = await sendStaffOnboardingEmail(
      email,
      fullName,
      onboardingUrl,
      roleNames
    );

    if (!emailSent) {
      console.error('Failed to send onboarding email');
      // Don't fail the request, user is still created
    }

    return NextResponse.json({
      success: true,
      message: 'Staff user created successfully',
      staffUser: result.staffUser ? {
        id: result.staffUser.id,
        email: result.staffUser.email,
        fullName: result.staffUser.full_name,
        roles: roleNames,
      } : undefined,
    });
  } catch (error) {
    console.error('Error in staff create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
