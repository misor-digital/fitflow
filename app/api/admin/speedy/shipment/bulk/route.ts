import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createWaybillForOrder, SpeedyApiError } from '@/lib/delivery/speedy';
import { bgnToEur } from '@/lib/delivery/speedy/config';
import type { OrderForShipment } from '@/lib/delivery/speedy';
import type { OrderRow, ShippingAddressSnapshot } from '@/lib/supabase/types';

interface BulkResultItem {
  orderId: string;
  orderNumber: string;
  status: 'created' | 'failed' | 'skipped';
  waybillId?: string;
  error?: string;
  actualCostEur?: number;
}

/**
 * POST /api/admin/speedy/shipment/bulk
 *
 * Admin-only. Bulk create Speedy waybills for orders in a cycle.
 * Body: { cycleId: string } or { orderIds: string[] }
 * Processes sequentially to avoid rate limits.
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
    const { cycleId, orderIds } = body as { cycleId?: string; orderIds?: string[] };

    if (!cycleId && !orderIds) {
      return NextResponse.json({ error: 'Задължително е cycleId или orderIds.' }, { status: 400 });
    }

    // Fetch orders that need waybills
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .is('speedy_waybill_id', null)
      .neq('status', 'cancelled');

    if (cycleId) {
      query = query.eq('delivery_cycle_id', cycleId);
    } else if (orderIds) {
      query = query.in('id', orderIds);
    }

    const { data: orders, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch orders for bulk shipment:', fetchError);
      return NextResponse.json({ error: 'Грешка при извличане на поръчки.' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        total: 0,
        created: 0,
        failed: 0,
        skipped: 0,
        results: [],
      });
    }

    // Process sequentially to avoid rate limits
    const results: BulkResultItem[] = [];
    let created = 0;
    let failed = 0;

    for (const order of orders as OrderRow[]) {
      try {
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
          finalPriceEur: Number(order.final_price_eur) || 0,
          deliveryFeeEur: Number(order.delivery_fee_eur) || 0,
        };

        const result = await createWaybillForOrder(orderForShipment);

        const actualCostEur = result.actualCost.currency === 'BGN'
          ? bgnToEur(result.actualCost.total)
          : Math.round(result.actualCost.total * 100) / 100;

        // Update order in DB
        await supabaseAdmin
          .from('orders')
          .update({
            speedy_waybill_id: result.waybillId,
            speedy_parcel_ids: result.parcelIds,
            speedy_created_at: new Date().toISOString(),
            speedy_status: 'created',
            delivery_fee_actual_eur: actualCostEur,
          })
          .eq('id', order.id);

        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'created',
          waybillId: result.waybillId,
          actualCostEur,
        });
        created++;
      } catch (error) {
        const errorMessage = error instanceof SpeedyApiError
          ? error.message
          : error instanceof Error ? error.message : 'Unknown error';

        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'failed',
          error: errorMessage,
        });
        failed++;
      }
    }

    return NextResponse.json({
      total: orders.length,
      created,
      failed,
      skipped: 0,
      results,
    });
  } catch (error) {
    console.error('Bulk shipment creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при масово създаване на товарителници.' },
      { status: 500 },
    );
  }
}
