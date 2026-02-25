/**
 * POST /api/admin/campaigns/:id/cancel — Cancel a campaign.
 *
 * Can cancel from any active (non-terminal) status: draft, scheduled,
 * sending, or paused. Terminal statuses (sent, cancelled, failed) cannot
 * be cancelled.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { cancelCampaign } from '@/lib/email/campaign-lifecycle';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
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

    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional for cancel
    }

    await cancelCampaign(id, session.userId, reason);

    return NextResponse.json({
      success: true,
      message: 'Кампанията е отменена.',
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[cancel POST]', err);

    if (message.includes('Invalid campaign transition')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
