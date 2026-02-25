/**
 * GET /api/admin/campaigns/:id/history — Campaign audit history.
 *
 * Returns all email_campaign_history rows for the given campaign,
 * ordered by created_at DESC (most recent first).
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { getCampaignHistory } from '@/lib/data/email-campaign-history';
import { supabaseAdmin } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
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

    const history = await getCampaignHistory(id);

    // Resolve changed_by user names
    const userIds = [...new Set(history.map((h) => h.changed_by))];
    const nameMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.full_name);
      }
    }

    const enrichedHistory = history
      .map((entry) => ({
        ...entry,
        changed_by_name: nameMap.get(entry.changed_by) ?? null,
      }))
      // Return most recent first for the API consumer
      .reverse();

    return NextResponse.json({ data: enrichedHistory });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[history GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
