/**
 * Marketing Campaign Follow-Up API
 * Endpoints for creating and managing follow-up campaigns
 * 
 * AUTHENTICATION: Requires admin user
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { logFollowUpCreation } from '@/lib/audit';
import {
  createFollowUpCampaign,
  countNonConvertedRecipients,
  populateFollowUpSends,
} from '@/lib/marketing/reportingService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketing/campaigns/[id]/follow-up
 * Get eligible recipient count for follow-up
 */
export async function GET(request: Request, { params }: RouteParams) {
  // Require admin authentication
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const windowHours = parseInt(searchParams.get('windowHours') || '48', 10);

    const { count, error } = await countNonConvertedRecipients(id, windowHours);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eligibleCount: count,
      windowHours,
    });
  } catch (error) {
    console.error('Error getting follow-up eligible count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/campaigns/[id]/follow-up
 * Create a follow-up campaign for non-converters
 * 
 * Body: {
 *   name: string;
 *   subject: string;
 *   template: string;
 *   previewText?: string;
 *   scheduledStartAt?: string;
 *   followUpWindowHours?: number;
 *   populateSends?: boolean; // If true, also create send records
 * }
 */
export async function POST(request: Request, { params }: RouteParams) {
  // Require admin authentication
  const { user, error: authError } = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.subject || !body.template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, template' },
        { status: 400 }
      );
    }

    // Create the follow-up campaign
    const { data: campaign, eligibleCount, error } = await createFollowUpCampaign(id, {
      name: body.name,
      subject: body.subject,
      template: body.template,
      previewText: body.previewText,
      scheduledStartAt: body.scheduledStartAt,
      followUpWindowHours: body.followUpWindowHours || 48,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Optionally populate send records
    let sendsCreated = 0;
    if (body.populateSends && campaign) {
      const { created, error: sendsError } = await populateFollowUpSends(campaign.id);
      if (sendsError) {
        console.warn('Error populating sends:', sendsError);
      }
      sendsCreated = created;
    }

    // Audit log: follow-up created
    if (campaign) {
      await logFollowUpCreation(
        user!.id,
        user!.email,
        campaign.id,
        id,
        request
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
      eligibleCount,
      sendsCreated,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
