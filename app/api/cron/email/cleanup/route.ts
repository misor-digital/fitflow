/**
 * Email Cleanup Cron
 *
 * Runs daily at 03:00 UTC. Handles:
 * 1. Archive old email_send_log entries (> 90 days → delete)
 * 2. Clean up draft campaigns older than 30 days with no recipients
 * 3. Reset monthly usage counter on 1st of month
 * 4. Clean up expired preorder conversion tokens
 *
 * Schedule: 0 3 * * * (daily at 03:00 UTC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const LOG_RETENTION_DAYS = 90;
const DRAFT_CLEANUP_DAYS = 30;
const DEFAULT_MONTHLY_LIMIT = 5000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');

  if (!cronSecret || cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let logsDeleted = 0;
  let draftsDeleted = 0;
  let tokensExpired = 0;
  let usageReset = false;

  try {
    // 2. Monthly usage reset — only on the 1st of the month
    const now = new Date();
    if (now.getUTCDate() === 1) {
      const currentMonth = now.toISOString().slice(0, 7) + '-01';

      const { error: resetError } = await supabaseAdmin
        .from('email_monthly_usage')
        .upsert(
          {
            month: currentMonth,
            transactional_sent: 0,
            campaign_sent: 0,
            monthly_limit: DEFAULT_MONTHLY_LIMIT,
            alert_sent_80: false,
            alert_sent_95: false,
          },
          { onConflict: 'month', ignoreDuplicates: true },
        );

      if (resetError) {
        console.error('[email-cleanup] Failed to reset monthly usage:', resetError);
      } else {
        usageReset = true;
        console.log(`[email-cleanup] Месечният брояч е нулиран за ${currentMonth}`);
      }
    }

    // 3. Log cleanup — delete email_send_log entries older than 90 days
    const logCutoff = new Date(
      Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: deletedLogs, error: logError } = await supabaseAdmin
      .from('email_send_log')
      .delete()
      .lt('created_at', logCutoff)
      .select('id');

    if (logError) {
      console.error('[email-cleanup] Log cleanup error:', logError);
    } else {
      logsDeleted = deletedLogs?.length ?? 0;
      console.log(`[email-cleanup] Deleted ${logsDeleted} old log entries (> ${LOG_RETENTION_DAYS} days)`);
    }

    // 4. Draft cleanup — delete empty drafts older than 30 days
    const draftCutoff = new Date(
      Date.now() - DRAFT_CLEANUP_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: deletedDrafts, error: draftError } = await supabaseAdmin
      .from('email_campaigns')
      .delete()
      .eq('status', 'draft')
      .lt('created_at', draftCutoff)
      .eq('total_recipients', 0)
      .select('id');

    if (draftError) {
      console.error('[email-cleanup] Draft cleanup error:', draftError);
    } else {
      draftsDeleted = deletedDrafts?.length ?? 0;
      console.log(`[email-cleanup] Deleted ${draftsDeleted} empty draft campaigns (> ${DRAFT_CLEANUP_DAYS} days)`);
    }

    // 5. Expired token cleanup — mark expired preorder conversion tokens
    const { data: expiredTokens, error: tokenError } = await supabaseAdmin
      .from('preorders')
      .update({ conversion_status: 'expired' })
      .lt('conversion_token_expires_at', new Date().toISOString())
      .eq('conversion_status', 'pending')
      .select('id');

    if (tokenError) {
      // Non-fatal — table may not have conversion columns yet
      console.warn('[email-cleanup] Token cleanup skipped or failed:', tokenError.message);
    } else {
      tokensExpired = expiredTokens?.length ?? 0;
      if (tokensExpired > 0) {
        console.log(`[email-cleanup] Expired ${tokensExpired} preorder conversion tokens`);
      }
    }

    const summary = {
      success: true,
      logsDeleted,
      draftsDeleted,
      tokensExpired,
      usageReset,
      timestamp: new Date().toISOString(),
    };

    console.log('[email-cleanup] Run complete:', JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[email-cleanup] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Email cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
