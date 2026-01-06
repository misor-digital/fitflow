/**
 * Marketing Campaign API - Single Campaign Operations
 * Endpoints for managing a specific campaign
 */

import { NextResponse } from 'next/server';
import {
  getCampaignById,
  updateCampaign,
  getCampaignProgress,
  type MarketingCampaignUpdate,
} from '@/lib/marketing';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketing/campaigns/[id]
 * Get a single campaign with progress
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const { data: campaign, error } = await getCampaignById(id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get progress stats
    const { data: progress } = await getCampaignProgress(id);

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        progress: progress || null,
      },
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/marketing/campaigns/[id]
 * Update a campaign
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update data
    const updateData: MarketingCampaignUpdate = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.template !== undefined) updateData.template = body.template;
    if (body.previewText !== undefined) updateData.preview_text = body.previewText;
    if (body.scheduledStartAt !== undefined) updateData.scheduled_start_at = body.scheduledStartAt;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.recipientFilter !== undefined) updateData.recipient_filter = body.recipientFilter;

    const { data: campaign, error } = await updateCampaign(id, updateData);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
