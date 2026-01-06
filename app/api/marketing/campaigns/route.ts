/**
 * Marketing Campaigns API
 * Endpoints for managing marketing campaigns
 */

import { NextResponse } from 'next/server';
import {
  createCampaign,
  getAllCampaigns,
  getCampaignProgress,
  type MarketingCampaignInsert,
} from '@/lib/marketing';

/**
 * GET /api/marketing/campaigns
 * List all campaigns with progress stats
 */
export async function GET() {
  try {
    const { data: campaigns, error } = await getAllCampaigns();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Fetch progress for each campaign
    const campaignsWithProgress = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { data: progress } = await getCampaignProgress(campaign.id);
        return {
          ...campaign,
          progress: progress || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithProgress,
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/campaigns
 * Create a new campaign
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.subject || !body.template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, template' },
        { status: 400 }
      );
    }

    // Build campaign data with optional follow-up fields
    const campaignData: MarketingCampaignInsert & {
      parent_campaign_id?: string;
      campaign_type?: 'primary' | 'follow_up';
      follow_up_window_hours?: number;
    } = {
      name: body.name,
      subject: body.subject,
      template: body.template,
      preview_text: body.previewText || null,
      scheduled_start_at: body.scheduledStartAt || null,
      status: body.status || 'draft',
      recipient_filter: body.recipientFilter || null,
    };

    // Add follow-up fields if provided
    if (body.parentCampaignId) {
      campaignData.parent_campaign_id = body.parentCampaignId;
      campaignData.campaign_type = body.campaignType || 'follow_up';
      campaignData.follow_up_window_hours = body.followUpWindowHours || 48;
    }

    const { data: campaign, error } = await createCampaign(campaignData);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
