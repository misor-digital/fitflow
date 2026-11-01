import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getPickupCutoffs } from '@/lib/delivery/speedy/pickup';
import { getSpeedyPickupDefaults } from '@/lib/delivery/speedy/config';
import { isValidYmd, todaySofia } from '@/lib/delivery/speedy/dates';
import { SpeedyApiError } from '@/lib/delivery/speedy';

/**
 * POST /api/admin/speedy/pickup/terms
 *
 * Admin-only. Returns the days on which a Speedy courier pickup can be requested
 * plus the configured pickup defaults.
 * Body: { startingDate?: 'YYYY-MM-DD' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { startingDate } = (body ?? {}) as { startingDate?: unknown };

    if (startingDate !== undefined && (!isValidYmd(startingDate) || startingDate < todaySofia())) {
      return NextResponse.json({ error: 'Невалидна начална дата.' }, { status: 400 });
    }

    const [cutoffs, defaults] = await Promise.all([
      getPickupCutoffs(typeof startingDate === 'string' ? startingDate : undefined),
      getSpeedyPickupDefaults(),
    ]);

    return NextResponse.json({
      cutoffs,
      defaults: {
        contactName: defaults.contactName,
        phone: defaults.phone,
        visitEndTime: defaults.visitEndTime,
      },
    });
  } catch (error) {
    console.error('Speedy pickup terms error:', error);

    if (error instanceof SpeedyApiError) {
      return NextResponse.json({ error: `Speedy: ${error.message}` }, { status: 502 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при извличане на дати за взимане.' },
      { status: 500 },
    );
  }
}
