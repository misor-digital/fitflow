/**
 * API Route: Send Campaign
 * POST /api/staff/campaigns/[id]/send
 * Sends campaign to all subscribed newsletter subscribers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { sendCampaign } from '@/lib/supabase/campaignService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has permission to send campaigns
    const hasPermission = await hasAnyRole(user.id, [
      'super_admin',
      'admin_ops',
      'marketing_manager',
      'marketing_operator'
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to send campaigns' },
        { status: 403 }
      );
    }

    // Send campaign
    const result = await sendCampaign(params.id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign sent successfully',
      totalRecipients: result.totalRecipients,
      successfulSends: result.successfulSends,
      failedSends: result.failedSends,
    });
  } catch (error) {
    console.error('Error in campaign send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
