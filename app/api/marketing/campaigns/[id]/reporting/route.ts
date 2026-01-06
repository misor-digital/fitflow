/**
 * Marketing Campaign Reporting API
 * Server-side aggregation endpoint for campaign reporting
 * 
 * AUTHENTICATION: Requires admin user
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getCampaignReportingData } from '@/lib/marketing/reportingService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketing/campaigns/[id]/reporting
 * Get comprehensive reporting data for a campaign
 */
export async function GET(request: Request, { params }: RouteParams) {
  // Require admin authentication
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

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
