import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { togglePromoCode } from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';

const PROMO_MANAGEMENT_ROLES = new Set(['super_admin', 'admin', 'marketing']);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// PATCH /api/admin/promo/:id/toggle — Quick enable/disable
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
      `admin_promo_toggle:${ip}`,
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

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Полето "enabled" е задължително и трябва да е булева стойност.' },
        { status: 400 },
      );
    }

    const updated = await togglePromoCode(id, body.enabled);

    return NextResponse.json({ success: true, promo: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('не е намерен')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('PATCH /api/admin/promo/[id]/toggle error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка при промяна на статуса.' },
      { status: 500 },
    );
  }
}
