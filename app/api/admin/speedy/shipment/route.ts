import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrderById } from '@/lib/data';
import { createWaybillForOrder, SpeedyApiError } from '@/lib/delivery/speedy';
import { bgnToEur } from '@/lib/delivery/speedy/config';
import { isValidYmd, todaySofia } from '@/lib/delivery/speedy/dates';
import { toOrderForShipment } from '@/lib/delivery/speedy/shipments';

/**
 * POST /api/admin/speedy/shipment
 *
 * Admin-only. Creates a Speedy waybill for a single order.
 * Body: { orderId: string, pickupDate?: 'YYYY-MM-DD', senderMode?: 'pickup' | 'dropoff' }
 * (senderMode defaults to the configured mode)
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
    const { orderId, pickupDate, senderMode } = body as {
      orderId?: string;
      pickupDate?: unknown;
      senderMode?: unknown;
    };

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Полето orderId е задължително.' }, { status: 400 });
    }

    if (pickupDate !== undefined && (!isValidYmd(pickupDate) || pickupDate < todaySofia())) {
      return NextResponse.json({ error: 'Невалидна дата за взимане.' }, { status: 400 });
    }

    if (senderMode !== undefined && senderMode !== 'pickup' && senderMode !== 'dropoff') {
      return NextResponse.json({ error: "senderMode трябва да е 'pickup' или 'dropoff'." }, { status: 400 });
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

    // 4. Create waybill via Speedy API
    const result = await createWaybillForOrder(toOrderForShipment(order), {
      pickupDate: typeof pickupDate === 'string' ? pickupDate : undefined,
      senderMode,
    });

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
        speedy_sender_mode: result.senderMode,
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
