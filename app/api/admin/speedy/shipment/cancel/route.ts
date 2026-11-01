import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { cancelOrderWaybill } from '@/lib/delivery/speedy/cancellation';

/**
 * POST /api/admin/speedy/shipment/cancel
 *
 * Admin-only. Cancels a Speedy waybill for an order.
 * Body: { orderId: string, comment: string }
 *
 * On success: clears waybill data so it can be recreated.
 * On failure (already ordered for pickup / collected): preserves waybill data.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Auth check
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const { orderId, comment } = body as { orderId?: unknown; comment?: unknown };

    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ error: 'orderId е задължително.' }, { status: 400 });
    }

    // 3. Cancel (validation, Speedy call, DB cleanup and logging)
    const result = await cancelOrderWaybill(orderId, typeof comment === 'string' ? comment : '', {
      userId: session.userId,
      name: `${session.profile.first_name} ${session.profile.last_name}`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, reason: result.reason },
        { status: result.httpStatus },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Товарителница ${result.waybillId} е анулирана успешно.`,
    });
  } catch (error) {
    console.error('Speedy cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при анулиране.' },
      { status: 500 },
    );
  }
}
