/**
 * GET    /api/admin/campaigns/:id — Campaign detail with recipient stats.
 * PATCH  /api/admin/campaigns/:id — Update draft campaign fields.
 * DELETE /api/admin/campaigns/:id — Delete a draft campaign.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '@/lib/data/email-campaigns';
import { getRecipientStats, deleteRecipientsByCampaign } from '@/lib/data/email-recipients';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';
import {
  buildPreorderConversionRecipients,
  buildSubscriberRecipients,
  buildCustomerRecipients,
} from '@/lib/email/recipient-builder';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET — Campaign detail with recipient stats
// ---------------------------------------------------------------------------

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

    const stats = await getRecipientStats(id);

    return NextResponse.json({ data: { ...campaign, recipientStats: stats } });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[campaign GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update draft campaign
// ---------------------------------------------------------------------------

export async function PATCH(
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

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Само чернови кампании могат да бъдат редактирани.' },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const { name, subject, templateId, params, filter } = body as {
      name?: string;
      subject?: string;
      templateId?: number | null;
      params?: Record<string, unknown>;
      filter?: Record<string, unknown>;
    };

    // Build update payload — only include provided fields
    const updatePayload: Record<string, unknown> = {
      updated_by: session.userId,
    };
    if (name !== undefined) updatePayload.name = name;
    if (subject !== undefined) updatePayload.subject = subject;
    if (templateId !== undefined) updatePayload.template_id = templateId;
    if (params !== undefined) updatePayload.params = params;
    if (filter !== undefined) updatePayload.target_filter = filter;

    const updated = await updateCampaign(id, updatePayload);

    // If filter changed, re-populate recipients from scratch
    let recipientCount: number | undefined;
    if (filter !== undefined) {
      await deleteRecipientsByCampaign(id);

      let count = 0;
      switch (campaign.campaign_type) {
        case 'preorder-conversion':
          count = await buildPreorderConversionRecipients(id, filter as never);
          break;
        case 'lifecycle':
          count = await buildSubscriberRecipients(id, filter as never);
          break;
        case 'promotional':
          count = await buildCustomerRecipients(id, filter as never);
          break;
      }

      await updateCampaign(id, { total_recipients: count });
      recipientCount = count;
    }

    // Audit log
    await recordCampaignAction({
      campaign_id: id,
      action: 'updated',
      changed_by: session.userId,
      metadata: {
        updatedFields: Object.keys(body),
        filterChanged: filter !== undefined,
        ...(recipientCount !== undefined ? { recipientCount } : {}),
      },
      notes: `Кампания "${updated.name}" обновена`,
    });

    const finalCampaign =
      recipientCount !== undefined
        ? { ...updated, total_recipients: recipientCount }
        : updated;

    return NextResponse.json({ data: finalCampaign });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[campaign PATCH]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove draft campaign
// ---------------------------------------------------------------------------

export async function DELETE(
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

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Само чернови кампании могат да бъдат изтрити.' },
        { status: 400 },
      );
    }

    const campaignName = campaign.name;

    // Cascade deletes recipients via FK
    await deleteCampaign(id);

    // Audit log (campaign is deleted, but we still record action for audit)
    // Note: with FK CASCADE the history rows are also deleted.
    // To preserve the audit trail, log to console.
    console.log(
      `[campaign DELETE] Campaign "${campaignName}" (${id}) deleted by ${session.userId}`,
    );

    return NextResponse.json({ success: true, message: `Кампания "${campaignName}" изтрита.` });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[campaign DELETE]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
