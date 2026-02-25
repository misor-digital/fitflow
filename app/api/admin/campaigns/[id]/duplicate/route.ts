/**
 * POST /api/admin/campaigns/:id/duplicate — Duplicate a campaign.
 *
 * Creates a new draft campaign with the same settings, audience filter,
 * template, and params. Recipients are re-populated from the filter.
 * A/B test config is NOT duplicated.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { duplicateCampaign } from '@/lib/email/campaign-lifecycle';

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

    const newCampaign = await duplicateCampaign(id, session.userId);

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: 'Кампанията е дублирана.',
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[duplicate POST]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
