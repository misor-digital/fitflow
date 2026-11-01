import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { PickupRequestError, requestPickupForOrders } from '@/lib/delivery/speedy/pickup';

export const maxDuration = 60;

/**
 * POST /api/admin/speedy/pickup
 *
 * Admin-only. Requests a Speedy courier pickup for eligible waybills.
 * Body: {
 *   cycleId?: string, orderIds?: string[]   (exactly one)
 *   pickupDate: 'YYYY-MM-DD', visitEndTime: 'HH:mm',
 *   contactName?: string, phoneNumber?: string
 * }
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
    const { cycleId, orderIds, pickupDate, visitEndTime, contactName, phoneNumber } = body as {
      cycleId?: unknown;
      orderIds?: unknown;
      pickupDate?: unknown;
      visitEndTime?: unknown;
      contactName?: unknown;
      phoneNumber?: unknown;
    };

    if (
      (cycleId !== undefined && typeof cycleId !== 'string') ||
      (orderIds !== undefined && !Array.isArray(orderIds)) ||
      typeof pickupDate !== 'string' ||
      typeof visitEndTime !== 'string' ||
      (contactName !== undefined && typeof contactName !== 'string') ||
      (phoneNumber !== undefined && typeof phoneNumber !== 'string')
    ) {
      return NextResponse.json({ error: 'Невалидни данни за заявката.' }, { status: 400 });
    }

    const result = await requestPickupForOrders({
      cycleId: cycleId as string | undefined,
      orderIds: orderIds as string[] | undefined,
      pickupDate,
      visitEndTime,
      contactName: contactName as string | undefined,
      phoneNumber: phoneNumber as string | undefined,
      actorUserId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PickupRequestError) {
      return NextResponse.json(
        { error: error.message, ...error.details },
        { status: error.httpStatus },
      );
    }

    console.error('Speedy pickup request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при заявка за куриер.' },
      { status: 500 },
    );
  }
}
