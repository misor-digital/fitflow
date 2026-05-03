import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrderById } from '@/lib/data';
import { cancelWaybill } from '@/lib/delivery/speedy/cancellation';

/**
 * POST /api/admin/speedy/shipment/cancel
 *
 * Admin-only. Cancels a Speedy waybill for an order.
 * Body: { orderId: string, comment?: string }
 *
 * On success: clears waybill data so it can be recreated.
 * On failure (already picked up): preserves waybill data.
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
    const { orderId, comment } = body as { orderId?: string; comment?: string };

    if (!orderId) {
      return NextResponse.json({ error: 'orderId е задължително.' }, { status: 400 });
    }

    // 3. Fetch order
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    if (!order.speedy_waybill_id || !order.speedy_parcel_ids?.length) {
      return NextResponse.json(
        { error: 'Поръчката няма създадена товарителница.' },
        { status: 400 },
      );
    }

    // 4. Cancel the first parcel (primary)
    const parcelId = order.speedy_parcel_ids[0];
    const result = await cancelWaybill(parcelId, comment);

    if (!result.success) {
      // Map common Speedy error messages to Bulgarian
      let errorMsg = result.error ?? 'Неизвестна грешка.';
      if (errorMsg.includes('picked up') || errorMsg.includes('collected')) {
        errorMsg = 'Пратката вече е взета от куриер. Анулирането не е възможно.';
      } else if (errorMsg.includes('invalid') || errorMsg.includes('not found')) {
        errorMsg = 'Невалиден номер на товарителница.';
      } else if (errorMsg.includes('access') || errorMsg.includes('permission')) {
        errorMsg = 'Нямате достъп до тази пратка.';
      }

      return NextResponse.json({ error: errorMsg, success: false }, { status: 422 });
    }

    // 5. Clear waybill data from order (so it can be recreated)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        speedy_waybill_id: null,
        speedy_parcel_ids: null,
        speedy_created_at: null,
        speedy_status: 'canceled',
        speedy_status_code: null,
        speedy_last_tracked_at: null,
        delivery_fee_actual_eur: null,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to clear waybill data after cancellation:', updateError);
      return NextResponse.json(
        { error: 'Товарителницата е анулирана, но данните не бяха изчистени.' },
        { status: 500 },
      );
    }

    // 6. Log the cancellation
    console.log(
      `[Speedy Cancel] Order ${order.order_number} (${orderId}) — waybill ${order.speedy_waybill_id} canceled by ${session.profile.first_name} ${session.profile.last_name} (${session.userId})`,
    );

    return NextResponse.json({
      success: true,
      message: `Товарителница ${order.speedy_waybill_id} е анулирана успешно.`,
    });
  } catch (error) {
    console.error('Speedy cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при анулиране.' },
      { status: 500 },
    );
  }
}
