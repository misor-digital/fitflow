/**
 * API Route: Create Campaign
 * POST /api/staff/campaigns/create
 * Creates a new campaign draft (marketing_manager only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { createCampaign } from '@/lib/supabase/campaignService';

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

    // Check if user has permission to create campaigns
    const hasPermission = await hasAnyRole(user.id, [
      'super_admin',
      'admin_ops',
      'marketing_manager'
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only marketing managers can create campaigns' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { subject, htmlContent, textContent } = body;

    // Validate input
    if (!subject || !htmlContent || !textContent) {
      return NextResponse.json(
        { error: 'Subject, HTML content, and text content are required' },
        { status: 400 }
      );
    }

    if (subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject cannot be empty' },
        { status: 400 }
      );
    }

    if (htmlContent.trim().length === 0 || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    // Create campaign
    const result = await createCampaign({
      subject: subject.trim(),
      htmlContent: htmlContent.trim(),
      textContent: textContent.trim(),
      createdBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign created successfully',
      campaign: result.campaign,
    });
  } catch (error) {
    console.error('Error in campaign create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
