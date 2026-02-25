/**
 * GET  /api/admin/campaigns/:id/ab-test — Get A/B test variants and results.
 * POST /api/admin/campaigns/:id/ab-test — Create / update A/B test variants.
 * DELETE /api/admin/campaigns/:id/ab-test — Remove A/B test from campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import {
  createABTest,
  getABTestResults,
  deleteABTest,
  determineWinner,
  type ABVariantInput,
} from '@/lib/email/ab-testing';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Кампанията не е намерена.' },
        { status: 404 },
      );
    }

    const results = await getABTestResults(id);

    // Determine winner if campaign is sent/completed
    let winner = null;
    const metric = request.nextUrl.searchParams.get('metric') as 'open_rate' | 'click_rate' | null;
    if (
      results.variants.length > 0 &&
      ['sent', 'failed', 'cancelled'].includes(campaign.status)
    ) {
      winner = await determineWinner(id, metric ?? 'open_rate');
    }

    return NextResponse.json({ data: results, winner });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[ab-test GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Кампанията не е намерена.' },
        { status: 404 },
      );
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'A/B тест може да се създаде само за чернова кампания.' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { variants } = body as { variants: ABVariantInput[] };

    if (!variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json(
        { error: 'Необходими са поне 2 варианта.' },
        { status: 400 },
      );
    }

    const created = await createABTest(id, variants);

    return NextResponse.json(
      { data: created, message: 'A/B тест е създаден.' },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[ab-test POST]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Кампанията не е намерена.' },
        { status: 404 },
      );
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'A/B тест може да бъде премахнат само за чернова кампания.' },
        { status: 400 },
      );
    }

    await deleteABTest(id);

    return NextResponse.json({ success: true, message: 'A/B тест е премахнат.' });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[ab-test DELETE]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
