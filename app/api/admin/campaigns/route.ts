/**
 * GET  /api/admin/campaigns  — Paginated campaign list with optional filters.
 * POST /api/admin/campaigns  — Create a new campaign and auto-populate recipients.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  createCampaign,
  getCampaignsPaginated,
  updateCampaign,
} from '@/lib/data/email-campaigns';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';
import {
  buildSubscriberRecipients,
  buildCustomerRecipients,
} from '@/lib/email/recipient-builder';
import type {
  EmailCampaignTypeEnum,
  EmailCampaignStatusEnum,
  TargetListTypeEnum,
} from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map campaign type to target list type for the DB schema.
 */
function targetListTypeFor(type: EmailCampaignTypeEnum): TargetListTypeEnum {
  switch (type) {
    case 'lifecycle':
      return 'subscribers';
    case 'promotional':
      return 'all-customers';
    default:
      return 'custom-list';
  }
}

/**
 * Resolve the template ID: explicit value from body > type-specific default.
 */
function resolveTemplateId(
  _type: EmailCampaignTypeEnum,
  explicit?: number | null,
): number | null {
  if (explicit !== undefined && explicit !== null) return explicit;
  return null;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), 100);
    const status = (searchParams.get('status') as EmailCampaignStatusEnum) ?? undefined;
    const type = (searchParams.get('type') as EmailCampaignTypeEnum) ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const { campaigns, total } = await getCampaignsPaginated(page, limit, {
      status,
      type,
      search,
    });

    return NextResponse.json({ data: campaigns, total, page, limit });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[campaigns GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

const VALID_TYPES: EmailCampaignTypeEnum[] = [
  'one-off',
  'promotional',
  'lifecycle',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const {
      name,
      type,
      subject,
      templateId,
      filter,
      params,
    } = body as {
      name?: string;
      type?: string;
      subject?: string;
      templateId?: number | null;
      filter?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };

    // Validate required fields
    if (!name || !type || !subject) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета (name, type, subject).' },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(type as EmailCampaignTypeEnum)) {
      return NextResponse.json(
        { error: `Невалиден тип кампания: ${type}` },
        { status: 400 },
      );
    }

    const campaignType = type as EmailCampaignTypeEnum;
    const resolvedTemplateId = resolveTemplateId(campaignType, templateId as number | null);

    // Create campaign in draft status
    const campaign = await createCampaign({
      name: name as string,
      subject: subject as string,
      campaign_type: campaignType,
      target_list_type: targetListTypeFor(campaignType),
      template_id: resolvedTemplateId,
      target_filter: (filter as Record<string, unknown>) ?? {},
      params: (params as Record<string, unknown>) ?? {},
      created_by: session.userId,
    });

    // Auto-populate recipients based on campaign type
    let recipientCount = 0;

    switch (campaignType) {
      case 'lifecycle':
        recipientCount = await buildSubscriberRecipients(campaign.id, filter as never);
        break;
      case 'promotional':
        recipientCount = await buildCustomerRecipients(campaign.id, filter as never);
        break;
      // 'one-off' — no auto-population; recipients added manually or via custom-list
    }

    // Update campaign total_recipients
    if (recipientCount > 0) {
      await updateCampaign(campaign.id, {
        total_recipients: recipientCount,
        updated_by: session.userId,
      });
    }

    // Audit log
    await recordCampaignAction({
      campaign_id: campaign.id,
      action: 'created',
      changed_by: session.userId,
      metadata: { type: campaignType, recipientCount, filter: filter ?? {} },
      notes: `Кампания "${name}" създадена с ${recipientCount} получатели`,
    });

    return NextResponse.json(
      { data: { ...campaign, total_recipients: recipientCount } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[campaigns POST]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
