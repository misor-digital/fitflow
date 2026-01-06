/**
 * Marketing Campaign Runner API
 * Endpoint for triggering the campaign processor
 * 
 * This can be called by a cron job or external scheduler
 */

import { NextResponse } from 'next/server';
import { runCampaignProcessor, getRunnerStatus } from '@/lib/marketing';

/**
 * POST /api/marketing/runner
 * Trigger the campaign processor to check and send scheduled campaigns
 * 
 * This endpoint should be protected in production (e.g., with a secret key)
 */
export async function POST(request: Request) {
  try {
    // Optional: Verify authorization. // TODO: Add env var to dev and stage envs.
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.MARKETING_RUNNER_SECRET;
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if already running
    const status = getRunnerStatus();
    if (status.isRunning) {
      return NextResponse.json({
        success: false,
        message: 'Runner is already processing',
        status,
      }, { status: 409 });
    }

    // Run the processor
    console.log('[Marketing Runner API] Starting campaign processor');
    const result = await runCampaignProcessor();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });

  } catch (error) {
    console.error('Error running campaign processor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketing/runner
 * Get the current runner status
 */
export async function GET() {
  try {
    const status = getRunnerStatus();

    return NextResponse.json({
      success: true,
      status,
    });

  } catch (error) {
    console.error('Error getting runner status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
