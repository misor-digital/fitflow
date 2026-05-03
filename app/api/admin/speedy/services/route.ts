import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getDestinationServices } from '@/lib/delivery/speedy';

/**
 * POST /api/admin/speedy/services
 *
 * Admin-only. Returns available Speedy courier services for a given route.
 * Body: { senderClientId: number; recipientSiteId: number }
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

    const body = await request.json();
    const { senderClientId, recipientSiteId } = body as {
      senderClientId?: number;
      recipientSiteId?: number;
    };

    if (!senderClientId || !recipientSiteId) {
      return NextResponse.json(
        { error: 'Полетата senderClientId и recipientSiteId са задължителни.' },
        { status: 400 },
      );
    }

    const result = await getDestinationServices({
      senderClientId,
      recipientSiteId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Speedy destination services error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при извличане на услуги от Speedy.' },
      { status: 500 },
    );
  }
}
