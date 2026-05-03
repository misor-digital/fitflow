import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrderById } from '@/lib/data';
import { createWaybillForOrder, SpeedyApiError } from '@/lib/delivery/speedy';
import { bgnToEur } from '@/lib/delivery/speedy/config';
import type { OrderForShipment } from '@/lib/delivery/speedy';
import type { ShippingAddressSnapshot } from '@/lib/supabase/types';

/**
 * POST /api/admin/speedy/shipment
 *
 * Admin-only. Creates a Speedy waybill for a single order.
 * Body: { orderId: string }
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
    const { orderId } = body as { orderId?: string };

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Полето orderId е задължително.' }, { status: 400 });
    }

    // 3. Fetch order
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    // Don't recreate if already has a waybill
    if (order.speedy_waybill_id) {
      return NextResponse.json(
        { error: `Поръчката вече има товарителница: ${order.speedy_waybill_id}` },
        { status: 409 },
      );
    }

    // 4. Build order for shipment
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

    // 5. Create waybill via Speedy API
    const result = await createWaybillForOrder(orderForShipment);

    // 6. Convert actual cost to EUR (Speedy returns BGN)
    const actualCostEur = result.actualCost.currency === 'BGN'
      ? bgnToEur(result.actualCost.total)
      : Math.round(result.actualCost.total * 100) / 100;

    // 7. Update order with waybill data and actual cost
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        speedy_waybill_id: result.waybillId,
        speedy_parcel_ids: result.parcelIds,
        speedy_created_at: new Date().toISOString(),
        speedy_status: 'created',
        delivery_fee_actual_eur: actualCostEur,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order with waybill data:', updateError);
      return NextResponse.json({
        ...result,
        actualCostEur,
        warning: 'Товарителницата е създадена, но записът в базата не е обновен.',
      });
    }

    return NextResponse.json({ ...result, actualCostEur });
  } catch (error) {
    console.error('Speedy shipment creation error:', error);

    if (error instanceof SpeedyApiError) {
      return NextResponse.json(
        { error: `Speedy API грешка: ${error.message}`, details: error.responseBody },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при създаване на товарителница.' },
      { status: 500 },
    );
  }
}
