/**
 * GET  /api/admin/feedback       — Paginated feedback form list
 * POST /api/admin/feedback       — Create a new feedback form
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  createFeedbackForm,
  getFeedbackFormsPaginated,
  isValidSlug,
  recordFormAction,
} from '@/lib/data/feedback-forms';

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), 100);
    const isActive = searchParams.get('status') === 'active'
      ? true
      : searchParams.get('status') === 'inactive'
        ? false
        : undefined;
    const search = searchParams.get('search') ?? undefined;

    const { forms, total } = await getFeedbackFormsPaginated(page, limit, {
      isActive,
      search,
    });

    return NextResponse.json({ data: forms, total, page, limit });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

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

    const { title, slug, description, schema, settings, campaignId, deliveryCycleId, accessToken } = body as {
      title?: string;
      slug?: string;
      description?: string;
      schema?: unknown;
      settings?: Record<string, unknown>;
      campaignId?: string;
      deliveryCycleId?: string;
      accessToken?: string;
    };

    if (!title || !slug || !schema) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета (title, slug, schema).' },
        { status: 400 },
      );
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Невалиден slug. Позволени: a-z, 0-9, тире. Дължина: 3-80 символа.' },
        { status: 400 },
      );
    }

    const form = await createFeedbackForm({
      title: title as string,
      slug: slug as string,
      description: (description as string) || null,
      schema: schema as never,
      settings: (settings as never) ?? {},
      access_token: (accessToken as string) || null,
      campaign_id: (campaignId as string) || null,
      delivery_cycle_id: (deliveryCycleId as string) || null,
      created_by: session.userId,
    });

    await recordFormAction({
      form_id: form.id,
      action: 'created',
      changed_by: session.userId,
      metadata: { title, slug },
    });

    return NextResponse.json({ data: form }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    const status = message.includes('slug') ? 409 : 500;
    if (status === 500) console.error('[feedback POST]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
