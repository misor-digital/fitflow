import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createWaybillForOrder, SpeedyApiError } from '@/lib/delivery/speedy';
import { bgnToEur } from '@/lib/delivery/speedy/config';
import { isValidYmd, todaySofia } from '@/lib/delivery/speedy/dates';
import { toOrderForShipment } from '@/lib/delivery/speedy/shipments';
import type { OrderRow, SpeedySenderMode } from '@/lib/supabase/types';

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
 * Body: { cycleId: string } or { orderIds: string[] }, optional pickupDate: 'YYYY-MM-DD',
 * optional senderModes: { [orderId]: 'pickup' | 'dropoff' } (others use the configured mode)
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
    const { cycleId, orderIds, pickupDate, senderModes } = body as {
      cycleId?: string;
      orderIds?: string[];
      pickupDate?: unknown;
      senderModes?: unknown;
    };

    if (!cycleId && !orderIds) {
      return NextResponse.json({ error: 'Задължително е cycleId или orderIds.' }, { status: 400 });
    }

    if (pickupDate !== undefined && (!isValidYmd(pickupDate) || pickupDate < todaySofia())) {
      return NextResponse.json({ error: 'Невалидна дата за взимане.' }, { status: 400 });
    }

    if (
      senderModes !== undefined &&
      (typeof senderModes !== 'object' ||
        senderModes === null ||
        Array.isArray(senderModes) ||
        !Object.values(senderModes).every((m) => m === 'pickup' || m === 'dropoff'))
    ) {
      return NextResponse.json(
        { error: "senderModes трябва да съдържа само 'pickup' или 'dropoff'." },
        { status: 400 },
      );
    }
    const modeByOrder = (senderModes ?? {}) as Record<string, SpeedySenderMode>;

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
        const result = await createWaybillForOrder(toOrderForShipment(order), {
          pickupDate: typeof pickupDate === 'string' ? pickupDate : undefined,
          senderMode: modeByOrder[order.id],
        });

        const actualCostEur = result.actualCost.currency === 'BGN'
          ? bgnToEur(result.actualCost.total)
          : Math.round(result.actualCost.total * 100) / 100;

        // Update order in DB
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
          .eq('id', order.id);

        if (updateError) {
          console.error('Failed to update order with waybill data (bulk):', {
            orderId: order.id,
            waybillId: result.waybillId,
            error: updateError,
          });
          results.push({
            orderId: order.id,
            orderNumber: order.order_number,
            status: 'failed',
            waybillId: result.waybillId,
            error: `Товарителница ${result.waybillId} е създадена, но записът в базата не е обновен.`,
            actualCostEur,
          });
          failed++;
          continue;
        }

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
