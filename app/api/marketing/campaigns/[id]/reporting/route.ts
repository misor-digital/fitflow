/**
 * Marketing Campaign Reporting API
 * Server-side aggregation endpoint for campaign reporting
 */

import { NextResponse } from 'next/server';
import { getCampaignReportingData } from '@/lib/marketing/reportingService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketing/campaigns/[id]/reporting
 * Get comprehensive reporting data for a campaign
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await getCampaignReportingData(id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reporting: data,
    });
  } catch (error) {
    console.error('Error fetching campaign reporting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
