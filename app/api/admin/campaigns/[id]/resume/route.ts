/**
 * POST /api/admin/campaigns/:id/resume — Resume a paused campaign.
 *
 * Transitions the campaign back to 'sending' and continues processing
 * any remaining pending recipients.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { resumeCampaign } from '@/lib/email/campaign-lifecycle';

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

    await resumeCampaign(id, session.userId);

    return NextResponse.json({
      success: true,
      message: 'Кампанията е възобновена.',
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[resume POST]', err);

    if (message.includes('Invalid campaign transition')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
