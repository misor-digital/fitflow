import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getOrderById } from '@/lib/data';
import { calculateShipment, SpeedyApiError } from '@/lib/delivery/speedy';
import { buildShipmentRequest } from '@/lib/delivery/speedy/shipments';
import { bgnToEur } from '@/lib/delivery/speedy/config';
import type { OrderForShipment } from '@/lib/delivery/speedy';
import type { ShippingAddressSnapshot } from '@/lib/supabase/types';

/**
 * POST /api/admin/speedy/calculate
 *
 * Admin-only. Preview Speedy shipping cost for an order without creating a waybill.
 * Body: { orderId: string }
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
    const { orderId } = body as { orderId?: string };

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Полето orderId е задължително.' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    const addr = order.shipping_address as ShippingAddressSnapshot;
    const orderForShipment: OrderForShipment = {
      id: order.id,
      deliveryMethod: order.delivery_method,
      shippingAddress: {
        first_name: addr.first_name,
        last_name: addr.last_name,
        phone: addr.phone,
        city: addr.city,
        postal_code: addr.postal_code,
        street_address: addr.street_address,
        building_entrance: addr.building_entrance,
        floor: addr.floor,
        apartment: addr.apartment,
        delivery_notes: addr.delivery_notes,
        speedy_office_id: addr.speedy_office_id,
        speedy_office_name: addr.speedy_office_name,
        speedy_office_address: addr.speedy_office_address,
      },
      userEmail: order.customer_email,
      userPhone: order.customer_phone || addr.phone || '',
      readableId: order.order_number,
    };

    const params = buildShipmentRequest(orderForShipment);
    const calcResult = await calculateShipment(params);

    const calculation = calcResult.calculations[0];
    if (!calculation) {
      return NextResponse.json({ error: 'Няма калкулация от Speedy.' }, { status: 502 });
    }

    const costEur = calculation.price.currency === 'BGN'
      ? bgnToEur(calculation.price.total)
      : Math.round(calculation.price.total * 100) / 100;

    return NextResponse.json({
      serviceId: calculation.serviceId,
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
