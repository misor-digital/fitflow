import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { listPromoCodes, createPromoCode } from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import type { PromoCodeFilters } from '@/lib/data/promo';
import { revalidateDataTag, TAG_PROMO, TAG_CATALOG } from '@/lib/data/cache-tags';

const PROMO_MANAGEMENT_ROLES = new Set(['super_admin', 'admin', 'marketing']);

const VALID_STATUSES = new Set(['all', 'active', 'inactive', 'expired', 'exhausted']);
const VALID_SORTS = new Set(['newest', 'oldest', 'most-used', 'code-asc']);
const CODE_REGEX = /^[A-Z0-9_-]{2,30}$/;

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

function validatePromoInput(body: Record<string, unknown>, isCreate: boolean) {
  const errors: string[] = [];

  // Code
  if (isCreate || body.code !== undefined) {
    const code =
      typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (isCreate && !code) {
      errors.push('Кодът е задължителен.');
    }
    if (code && !CODE_REGEX.test(code)) {
      errors.push(
        'Кодът трябва да е 2-30 символа (букви, цифри, тире, долна черта).',
      );
    }
  }

  // Discount percent
  if (isCreate || body.discount_percent !== undefined) {
    const dp = Number(body.discount_percent);
    if (isCreate && (isNaN(dp) || dp <= 0 || dp > 100)) {
      errors.push('Отстъпката трябва да е между 0.01 и 100.');
    }
    if (
      !isCreate &&
      body.discount_percent !== undefined &&
      (isNaN(dp) || dp <= 0 || dp > 100)
    ) {
      errors.push('Отстъпката трябва да е между 0.01 и 100.');
    }
  }

  // Description
  if (body.description !== undefined && body.description !== null) {
    if (
      typeof body.description !== 'string' ||
      body.description.length > 500
    ) {
      errors.push('Описанието трябва да е текст до 500 символа.');
    }
  }

  // Date range
  if (body.starts_at && body.ends_at) {
    if (
      new Date(body.ends_at as string) <= new Date(body.starts_at as string)
    ) {
      errors.push('Крайната дата трябва да е след началната.');
    }
  }

  // Max uses
  if (body.max_uses !== undefined && body.max_uses !== null) {
    if (
      !Number.isInteger(body.max_uses) ||
      (body.max_uses as number) < 1
    ) {
      errors.push('Максималните използвания трябва да е положително цяло число.');
    }
  }

  // Max uses per user
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

  return errors;
}

// ============================================================================
// GET /api/admin/promo — Paginated list with filters
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !PROMO_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    // Rate limit
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_promo_list:${ip}`, 60, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // Parse query params
    const params = request.nextUrl.searchParams;
    const search = params.get('search') || undefined;
    const status = params.get('status') || undefined;
    const sort = params.get('sort') || undefined;
    const pageParam = params.get('page');
    const limitParam = params.get('limit');

    // Validate
    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'Невалиден статус филтър.' },
        { status: 400 },
      );
    }
    if (sort && !VALID_SORTS.has(sort)) {
      return NextResponse.json(
        { error: 'Невалиден начин на сортиране.' },
        { status: 400 },
      );
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Невалидни параметри за страниране.' },
        { status: 400 },
      );
    }

    const filters: PromoCodeFilters = {
      search,
      status: status as PromoCodeFilters['status'],
      sort: sort as PromoCodeFilters['sort'],
      page,
      limit,
    };

    const result = await listPromoCodes(filters);

    return NextResponse.json({
      promos: result.data,
      total: result.total,
      page,
      limit,
    });
  } catch (err) {
    console.error('GET /api/admin/promo error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при зареждане на промо кодовете.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/admin/promo — Create a new promo code
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !PROMO_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    // Rate limit
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(
      `admin_promo_create:${ip}`,
      10,
      60,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
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

    // Validate
    const errors = validatePromoInput(body, true);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(' ') },
        { status: 400 },
      );
    }

    // Build insert payload
    const code = (body.code as string).trim().toUpperCase();
    const payload: Record<string, unknown> = {
      code,
      discount_percent: Number(body.discount_percent),
    };

    if (body.description !== undefined) payload.description = body.description;
    if (typeof body.is_enabled === 'boolean') payload.is_enabled = body.is_enabled;
    if (body.starts_at !== undefined) payload.starts_at = body.starts_at;
    if (body.ends_at !== undefined) payload.ends_at = body.ends_at;
    if (body.max_uses !== undefined) payload.max_uses = body.max_uses;
    if (body.max_uses_per_user !== undefined)
      payload.max_uses_per_user = body.max_uses_per_user;

    const created = await createPromoCode(
      payload as unknown as Parameters<typeof createPromoCode>[0],
    );

    // Bust catalog cache so price calculations pick up new promo codes
    revalidateDataTag(TAG_PROMO, TAG_CATALOG);

    return NextResponse.json(
      { success: true, promo: created },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('вече съществува')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error('POST /api/admin/promo error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при създаване на промо кода.' },
      { status: 500 },
    );
  }
}
