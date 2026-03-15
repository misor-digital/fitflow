/**
 * GET    /api/admin/feedback/[id]  — Feedback form detail
 * PATCH  /api/admin/feedback/[id]  — Update a feedback form
 * DELETE /api/admin/feedback/[id]  — Delete a feedback form
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  getFeedbackFormById,
  updateFeedbackForm,
  deleteFeedbackForm,
  getResponseCountByForm,
  recordFormAction,
  isValidSlug,
} from '@/lib/data/feedback-forms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await params;

    const form = await getFeedbackFormById(id);
    if (!form) {
      return NextResponse.json({ error: 'Формулярът не е намерен.' }, { status: 404 });
    }

    const responseCount = await getResponseCountByForm(id);

    return NextResponse.json({ data: { ...form, response_count: responseCount } });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback/:id GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await getFeedbackFormById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Формулярът не е намерен.' }, { status: 404 });
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

    const {
      title,
      slug,
      description,
      schema,
      settings,
      isActive,
      startsAt,
      endsAt,
      campaignId,
      deliveryCycleId,
    } = body as {
      title?: string;
      slug?: string;
      description?: string | null;
      schema?: unknown;
      settings?: Record<string, unknown>;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      campaignId?: string | null;
      deliveryCycleId?: string | null;
    };

    if (slug !== undefined && !isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Невалиден slug.' },
        { status: 400 },
      );
    }

    // Build update payload — only include provided fields
    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title;
    if (slug !== undefined) update.slug = slug;
    if (description !== undefined) update.description = description;
    if (settings !== undefined) update.settings = settings;

    // Sync access_token with requireToken setting
    if (settings !== undefined) {
      const wantsToken = !!(settings as Record<string, unknown>).requireToken;
      if (wantsToken && !existing.access_token) {
        update.access_token = crypto.randomUUID().replace(/-/g, '');
      } else if (!wantsToken && existing.access_token) {
        update.access_token = null;
      }
    }

    if (isActive !== undefined) update.is_active = isActive;
    if (startsAt !== undefined) update.starts_at = startsAt;
    if (endsAt !== undefined) update.ends_at = endsAt;
    if (campaignId !== undefined) update.campaign_id = campaignId;
    if (deliveryCycleId !== undefined) update.delivery_cycle_id = deliveryCycleId;

    // Schema/content edits only allowed on inactive forms
    if (schema !== undefined && existing.is_active) {
      return NextResponse.json(
        { error: 'Не може да се редактира активен формуляр. Деактивирайте го първо.' },
        { status: 400 },
      );
    }

    // Schema update -> increment version only if schema actually changed
    // Use sorted-key stringify to handle Postgres JSONB key reordering
    if (schema !== undefined) {
      const stable = (v: unknown): string =>
        JSON.stringify(v, (_, val) =>
          val && typeof val === 'object' && !Array.isArray(val)
            ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
            : val,
        );
      const schemaChanged = stable(schema) !== stable(existing.schema);
      if (schemaChanged) {
        update.schema = schema;
        update.version = existing.version + 1;
      }
    }

    const form = await updateFeedbackForm(id, update as never);

    // Audit log
    const schemaWasUpdated = update.schema !== undefined;
    const action = isActive !== undefined && isActive !== existing.is_active
      ? (isActive ? 'published' : 'unpublished')
      : schemaWasUpdated
        ? 'schema_updated'
        : 'updated';

    await recordFormAction({
      form_id: id,
      action,
      changed_by: session.userId,
      previous_schema: schemaWasUpdated ? existing.schema : undefined,
      metadata: { updatedFields: Object.keys(update) },
    });

    return NextResponse.json({ data: form });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    const status = message.includes('slug') ? 409 : 500;
    if (status === 500) console.error('[feedback/:id PATCH]', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await getFeedbackFormById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Формулярът не е намерен.' }, { status: 404 });
    }

    await recordFormAction({
      form_id: id,
      action: 'deleted',
      changed_by: session.userId,
      previous_schema: existing.schema,
      metadata: { title: existing.title, slug: existing.slug },
    });

    await deleteFeedbackForm(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback/:id DELETE]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
