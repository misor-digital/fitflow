import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import {
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeStats,
} from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { revalidateDataTag, TAG_PROMO, TAG_CATALOG } from '@/lib/data/cache-tags';

const PROMO_MANAGEMENT_ROLES = new Set(['super_admin', 'admin', 'marketing']);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_REGEX = /^[A-Z0-9_-]{2,30}$/;

// ---------------------------------------------------------------------------
// Shared auth helper
// ---------------------------------------------------------------------------

async function authorizeStaff() {
  const session = await verifySession();
  if (!session || session.profile.user_type !== 'staff') {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      ),
    };
  }
  if (
    !session.profile.staff_role ||
    !PROMO_MANAGEMENT_ROLES.has(session.profile.staff_role)
  ) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      ),
    };
  }
  return { authorized: true as const, session };
}

// ============================================================================
// GET /api/admin/promo/:id — Single promo with stats
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await authorizeStaff();
    if (!auth.authorized) return auth.response;

    // Rate limit
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_promo_get:${ip}`, 60, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    const [promo, stats] = await Promise.all([
      getPromoCodeById(id),
      getPromoCodeStats(id),
    ]);

    if (!promo) {
      return NextResponse.json(
        { error: 'Промо кодът не е намерен.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ promo, stats });
  } catch (err) {
    console.error('GET /api/admin/promo/[id] error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при зареждане на промо кода.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/admin/promo/:id — Update promo fields
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await authorizeStaff();
    if (!auth.authorized) return auth.response;

    // Rate limit
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(
      `admin_promo_update:${ip}`,
      30,
      60,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    // Strip current_uses — prevent manual manipulation
    delete body.current_uses;

    // Validate
    const errors: string[] = [];

    if (body.code !== undefined) {
      const code =
        typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!code || !CODE_REGEX.test(code)) {
        errors.push(
          'Кодът трябва да е 2-30 символа (букви, цифри, тире, долна черта).',
        );
      }
    }

    if (body.discount_percent !== undefined) {
      const dp = Number(body.discount_percent);
      if (isNaN(dp) || dp <= 0 || dp > 100) {
        errors.push('Отстъпката трябва да е между 0.01 и 100.');
      }
    }

    if (body.description !== undefined && body.description !== null) {
      if (
        typeof body.description !== 'string' ||
        body.description.length > 500
      ) {
        errors.push('Описанието трябва да е текст до 500 символа.');
      }
    }

    if (body.max_uses !== undefined && body.max_uses !== null) {
      if (
        !Number.isInteger(body.max_uses) ||
        (body.max_uses as number) < 1
      ) {
        errors.push(
          'Максималните използвания трябва да е положително цяло число.',
        );
      }
    }

    if (body.max_uses_per_user !== undefined && body.max_uses_per_user !== null) {
      if (
        !Number.isInteger(body.max_uses_per_user) ||
        (body.max_uses_per_user as number) < 1
      ) {
        errors.push(
          'Максималните използвания на потребител трябва да е положително цяло число.',
        );
      }
    }

    // Date cross-validation: need to check against existing record if only one
    // date is provided
    if (body.starts_at !== undefined || body.ends_at !== undefined) {
      const existing = await getPromoCodeById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Промо кодът не е намерен.' },
          { status: 404 },
        );
      }
      const startsAt =
        body.starts_at !== undefined ? body.starts_at : existing.starts_at;
      const endsAt =
        body.ends_at !== undefined ? body.ends_at : existing.ends_at;

      if (
        startsAt &&
        endsAt &&
        new Date(endsAt as string) <= new Date(startsAt as string)
      ) {
        errors.push('Крайната дата трябва да е след началната.');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(' ') },
        { status: 400 },
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {};
    if (body.code !== undefined)
      updates.code = (body.code as string).trim().toUpperCase();
    if (body.discount_percent !== undefined)
      updates.discount_percent = Number(body.discount_percent);
    if (body.description !== undefined) updates.description = body.description;
    if (typeof body.is_enabled === 'boolean')
      updates.is_enabled = body.is_enabled;
    if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
    if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
    if (body.max_uses !== undefined) updates.max_uses = body.max_uses;
    if (body.max_uses_per_user !== undefined)
      updates.max_uses_per_user = body.max_uses_per_user;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Няма полета за обновяване.' },
        { status: 400 },
      );
    }

    const updated = await updatePromoCode(
      id,
      updates as Parameters<typeof updatePromoCode>[1],
    );

    revalidateDataTag(TAG_PROMO, TAG_CATALOG);

    return NextResponse.json({ success: true, promo: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('вече съществува')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes('не е намерен')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('PATCH /api/admin/promo/[id] error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при обновяване на промо кода.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/admin/promo/:id — Delete (with usage guard)
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await authorizeStaff();
    if (!auth.authorized) return auth.response;

    // Rate limit
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(
      `admin_promo_delete:${ip}`,
      10,
      60,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    await deletePromoCode(id);

    revalidateDataTag(TAG_PROMO, TAG_CATALOG);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('бил използван')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes('не е намерен')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('DELETE /api/admin/promo/[id] error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при изтриване на промо кода.' },
      { status: 500 },
    );
  }
}
