/**
 * Marketing Campaign Actions API
 * Endpoints for campaign actions (start, pause, resume, cancel)
 * 
 * AUTHENTICATION: Requires admin user
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { logCampaignAction } from '@/lib/audit';
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
  // Require admin authentication
  const { user, error: authError } = await requireAdminAuth();
  if (authError) return authError;

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
    let auditAction: 'campaign.start' | 'campaign.pause' | 'campaign.resume' | 'campaign.cancel';

    switch (action) {
      case 'start':
        result = await startCampaign(id);
        auditAction = 'campaign.start';
        break;
      case 'start-dry-run':
        // Dry-run mode: simulate campaign without sending emails
        result = await startCampaign(id, { ...DEFAULT_RUNNER_CONFIG, dryRun: true });
        auditAction = 'campaign.start';
        break;
      case 'pause':
        result = await pauseCampaign(id);
        auditAction = 'campaign.pause';
        break;
      case 'resume':
        result = await resumeCampaign(id);
        auditAction = 'campaign.resume';
        break;
      case 'cancel':
        result = await cancelCampaign(id);
        auditAction = 'campaign.cancel';
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

    // Audit log: campaign action
    await logCampaignAction(
      user!.id,
      user!.email,
      auditAction,
      id,
      { action, dryRun: action === 'start-dry-run' },
      request
    );

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
