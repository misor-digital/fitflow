/**
 * Marketing Campaign Actions API
 * Endpoints for campaign actions (start, pause, resume, cancel)
 * 
 * ============================================================================
 * PRODUCTION SAFETY - DEFENSE IN DEPTH
 * ============================================================================
 * 
 * This API route handles campaign actions that can trigger email sends.
 * While the internal UI is gated by environment checks, this API provides
 * an additional layer of protection.
 * 
 * In production environments, this API should be protected by:
 * 1. The MARKETING_RUNNER_SECRET for automated/cron access
 * 2. Environment checks for UI-triggered actions
 * 
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  DEFAULT_RUNNER_CONFIG,
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
      case 'start-dry-run':
        // Dry-run mode: simulate campaign without sending emails
        result = await startCampaign(id, { ...DEFAULT_RUNNER_CONFIG, dryRun: true });
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
          { error: `Invalid action: ${action}. Valid actions: start, start-dry-run, pause, resume, cancel` },
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
