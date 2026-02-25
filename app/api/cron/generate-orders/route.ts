import { NextRequest, NextResponse } from 'next/server';
import { generateOrdersForActiveCycle } from '@/lib/delivery/generate';
import {
  sendCronErrorNotification,
  sendCronSuccessNotification,
  sendCronFailureNotification,
} from '@/lib/delivery/notifications';
import { upsertSiteConfig } from '@/lib/data';

// ============================================================================
// GET /api/cron/generate-orders — Automated order generation (Vercel Cron)
// ============================================================================

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60s for large batches

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Call the shared generation logic (auto-detect eligible cycle)
    const result = await generateOrdersForActiveCycle('system');

    // 3. Log result for Vercel function logs
    console.log('[CRON] Order generation completed:', JSON.stringify(result));

    // 4. Persist last run info to site_config
    await upsertSiteConfig('cron_last_run', new Date().toISOString());
    await upsertSiteConfig(
      'cron_last_result',
      JSON.stringify({
        cycleId: result.cycleId,
        cycleDate: result.cycleDate,
        generated: result.generated,
        skipped: result.skipped,
        excluded: result.excluded,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }),
    );

    // 5. Send admin notification if there were errors
    if (result.errors > 0) {
      await sendCronErrorNotification(result);
    }

    // 6. Send success summary to admin when orders were generated
    if (result.generated > 0) {
      await sendCronSuccessNotification(result);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[CRON] Order generation failed:', error);

    // Persist failure state
    try {
      await upsertSiteConfig('cron_last_run', new Date().toISOString());
      await upsertSiteConfig(
        'cron_last_result',
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (persistError) {
      console.error('[CRON] Failed to persist failure state:', persistError);
    }

    // Send failure notification
    await sendCronFailureNotification(error);

    return NextResponse.json(
      {
        error: 'Order generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
