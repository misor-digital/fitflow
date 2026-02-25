/**
 * Email Campaign Cron Processor
 *
 * Runs every 15 minutes. Handles:
 * 1. Process campaigns in 'sending' status (chunked processing)
 * 2. Trigger scheduled campaigns whose scheduled_at has passed
 * 3. Detect and recover stalled campaigns
 *
 * Schedule: *​/15 * * * * (every 15 minutes)
 * Auth: CRON_SECRET header validation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getScheduledCampaigns,
  getSendingCampaigns,
} from '@/lib/data/email-campaigns';
import { processCampaignChunk } from '@/lib/email/campaign-engine';
import { startCampaign } from '@/lib/email/campaign-lifecycle';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro timeout

const CRON_SECRET = process.env.CRON_SECRET;
const SYSTEM_USER_ID = 'system-cron';
const MAX_PROCESSING_TIME_MS = 50_000; // 50s — leave 10s buffer for Vercel 60s timeout
const CHUNK_SIZE = 200; // Recipients per cron invocation per campaign
const STALE_THRESHOLD_HOURS = 2;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth — validate CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');

  if (!cronSecret || cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let scheduledCount = 0;
  let processedCount = 0;
  let stalledCount = 0;

  try {
    // 2. Scheduled campaigns — trigger those whose scheduled_at has passed
    const scheduledCampaigns = await getScheduledCampaigns();

    for (const campaign of scheduledCampaigns) {
      try {
        await startCampaign(campaign.id, SYSTEM_USER_ID);
        await recordCampaignAction({
          campaign_id: campaign.id,
          action: 'started',
          changed_by: SYSTEM_USER_ID,
          notes: 'Автоматично стартирана по разписание',
          metadata: {
            scheduledAt: campaign.scheduled_at,
            triggeredBy: 'cron',
          },
        });
        scheduledCount++;
        console.log(`[email-cron] Started scheduled campaign ${campaign.id}`);
      } catch (err) {
        console.error(`[email-cron] Failed to start scheduled campaign ${campaign.id}:`, err);
      }

      // Time guard
      if (Date.now() - startTime > MAX_PROCESSING_TIME_MS) {
        console.warn('[email-cron] Approaching timeout after starting scheduled campaigns.');
        break;
      }
    }

    // 3. Sending campaigns — process chunks of pending recipients
    const sendingCampaigns = await getSendingCampaigns();

    // Detect stalled campaigns (updated_at > 2 hours ago)
    const staleThreshold = new Date(
      Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
    ).toISOString();

    for (const campaign of sendingCampaigns) {
      // Check if stalled
      if (campaign.updated_at < staleThreshold) {
        stalledCount++;
        console.warn(
          `[email-cron] Stalled campaign detected: ${campaign.id} (last updated: ${campaign.updated_at})`,
        );
        await recordCampaignAction({
          campaign_id: campaign.id,
          action: 'stalled_detected',
          changed_by: SYSTEM_USER_ID,
          notes: 'Открита застояла кампания, продължаване на обработката',
          metadata: {
            lastUpdated: campaign.updated_at,
            staleThresholdHours: STALE_THRESHOLD_HOURS,
          },
        }).catch(() => {});
      }

      // Time guard — stop processing if approaching timeout
      if (Date.now() - startTime > MAX_PROCESSING_TIME_MS) {
        console.warn('[email-cron] Approaching timeout — deferring remaining campaigns to next invocation.');
        break;
      }

      // Process a chunk
      try {
        const result = await processCampaignChunk(campaign.id, SYSTEM_USER_ID, CHUNK_SIZE);
        processedCount += result.processed;

        console.log(
          `[email-cron] Campaign ${campaign.id}: processed=${result.processed}, remaining=${result.remaining}, completed=${result.completed}`,
        );
      } catch (err) {
        console.error(`[email-cron] Error processing campaign ${campaign.id}:`, err);
      }
    }

    const summary = {
      success: true,
      scheduled: scheduledCount,
      processed: processedCount,
      stalled: stalledCount,
      elapsed: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log('[email-cron] Run complete:', JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[email-cron] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Email cron processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
