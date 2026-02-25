/**
 * POST /api/admin/campaigns/:id/start — Start (send) a campaign.
 *
 * Transitions the campaign to 'sending' and processes recipients.
 * For small campaigns (< 500 recipients), processing runs in-request.
 * For larger campaigns, the cron processor (Phase E10) handles processing
 * across multiple invocations.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { getOrCreateMonthUsage } from '@/lib/data/email-usage';
import { startCampaign } from '@/lib/email/campaign-lifecycle';
import { isNearMonthlyLimit } from '@/lib/email/monitoring';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Кампанията не е намерена.' },
        { status: 404 },
      );
    }

    // Pre-start validation: check monthly usage limits
    const usage = await getOrCreateMonthUsage();
    const projectedUsage = usage.total_sent + (campaign.total_recipients ?? 0);

    if (projectedUsage > usage.monthly_limit) {
      return NextResponse.json(
        {
          error: `Кампанията ще надхвърли месечния лимит. Текуща употреба: ${usage.total_sent}/${usage.monthly_limit}. Получатели: ${campaign.total_recipients}. Проектирана: ${projectedUsage}/${usage.monthly_limit}.`,
          warning: true,
        },
        { status: 400 },
      );
    }

    if (await isNearMonthlyLimit(85)) {
      console.warn(`[Campaign] Starting campaign ${id} with usage at >85%`);
    }

    // startCampaign validates the transition and calls processCampaign
    await startCampaign(id, session.userId);

    return NextResponse.json({
      success: true,
      message: 'Кампанията е стартирана.',
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[start POST]', err);

    // Surface lifecycle validation errors (invalid transition) as 400
    if (message.includes('Invalid campaign transition')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
