/**
 * Marketing Campaign Actions API
 * Endpoints for campaign actions (start, pause, resume, cancel)
 */

import { NextResponse } from 'next/server';
import {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
} from '@/lib/marketing';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/marketing/campaigns/[id]/actions
 * Execute an action on a campaign
 * 
 * Body: { action: 'start' | 'pause' | 'resume' | 'cancel' }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string };

    switch (action) {
      case 'start':
        result = await startCampaign(id);
        break;
      case 'pause':
        result = await pauseCampaign(id);
        break;
      case 'resume':
        result = await resumeCampaign(id);
        break;
      case 'cancel':
        result = await cancelCampaign(id);
        break;
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: start, pause, resume, cancel` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Campaign ${action} successful`,
    });

  } catch (error) {
    console.error('Error executing campaign action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
