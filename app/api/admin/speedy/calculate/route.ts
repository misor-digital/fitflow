import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getOrderById } from '@/lib/data';
import { SpeedyApiError } from '@/lib/delivery/speedy';
import { toOrderForShipment } from '@/lib/delivery/speedy/shipments';
import { getSpeedySenderConfig } from '@/lib/delivery/speedy/config';
import { calculateOrderCost } from '@/lib/delivery/speedy/estimates';

/**
 * POST /api/admin/speedy/calculate
 *
 * Admin-only. Preview Speedy shipping cost for an order without creating a waybill.
 * Body: { orderId: string, senderMode?: 'pickup' | 'dropoff' } (defaults to the configured mode)
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
    const { orderId, senderMode: requestedMode } = body as { orderId?: string; senderMode?: unknown };

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Полето orderId е задължително.' }, { status: 400 });
    }

    if (requestedMode !== undefined && requestedMode !== 'pickup' && requestedMode !== 'dropoff') {
      return NextResponse.json({ error: "senderMode трябва да е 'pickup' или 'dropoff'." }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    const senderMode = requestedMode ?? (await getSpeedySenderConfig()).senderMode;
    const { calculation, costEur } = await calculateOrderCost(toOrderForShipment(order), senderMode);

    return NextResponse.json({
      serviceId: calculation.serviceId,
      senderMode,
      price: calculation.price,
      costEur,
      deliveryDeadline: calculation.deliveryDeadline,
      pickupDate: calculation.pickupDate,
      customerPaid: order.delivery_fee_eur,
      margin: Math.round((order.delivery_fee_eur - costEur) * 100) / 100,
    });
  } catch (error) {
    console.error('Speedy calculation error:', error);

    if (error instanceof SpeedyApiError) {
      return NextResponse.json(
        { error: `Speedy API грешка: ${error.message}`, details: error.responseBody },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при калкулация.' },
      { status: 500 },
    );
  }
}
