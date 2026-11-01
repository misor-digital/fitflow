import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  trackParcelsBulk,
  isFinalStatus,
  clearOrderWaybill,
  SPEEDY_CANCELED_OPERATION_CODE,
} from '@/lib/delivery/speedy';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Non-final statuses that still need tracking. */
const FINAL_DB_STATUSES = ['delivered', 'returned', 'destroyed', 'theft', 'canceled', 'closed'];

/**
 * GET /api/cron/sync-tracking
 *
 * Background job to sync Speedy tracking statuses.
 * Run 3-5x per day (e.g., 8am, 11am, 2pm, 5pm, 8pm).
 * Protected by CRON_SECRET.
 *
 * Waybills cancelled directly in Speedy (operation 128) are cleared from the
 * order so a new waybill can be created.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch orders that have a waybill
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, speedy_waybill_id, speedy_parcel_ids, speedy_status')
      .not('speedy_waybill_id', 'is', null)
      .not('speedy_parcel_ids', 'is', null);

    if (error) {
      console.error('Failed to fetch orders for tracking sync:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    let cleared = 0;
    async function clearCancelled(orderId: string, waybillId: string) {
      const result = await clearOrderWaybill(orderId, waybillId);
      if (result.error) {
        console.error('[Tracking Sync] Failed to clear cancelled waybill', { orderId, waybillId, error: result.error });
      } else if (result.cleared) {
        cleared++;
        console.log(`[Tracking Sync] Waybill ${waybillId} was cancelled in Speedy — cleared from order ${orderId}`);
      }
    }

    // Rows already marked cancelled by an earlier sync but still holding the waybill
    for (const order of orders ?? []) {
      if (order.speedy_status === 'canceled' && order.speedy_waybill_id) {
        await clearCancelled(order.id, order.speedy_waybill_id);
      }
    }

    // Filter out orders with final statuses
    const ordersToTrack = (orders ?? []).filter(
      (o) => !o.speedy_status || !FINAL_DB_STATUSES.includes(o.speedy_status),
    );

    if (ordersToTrack.length === 0) {
      return NextResponse.json({ message: 'No orders to track', tracked: 0, cleared });
    }

    // Build parcel-to-order mapping
    const parcelToOrder = new Map<string, { orderId: string; waybillId: string }>();
    for (const order of ordersToTrack) {
      for (const parcelId of order.speedy_parcel_ids ?? []) {
        parcelToOrder.set(parcelId, { orderId: order.id, waybillId: order.speedy_waybill_id! });
      }
    }

    const allParcelIds = Array.from(parcelToOrder.keys());

    // Track all parcels (batched internally)
    const trackingResults = await trackParcelsBulk(allParcelIds);

    // Update orders with tracking results
    let updated = 0;
    const now = new Date().toISOString();

    for (const result of trackingResults) {
      const target = parcelToOrder.get(result.parcelId);
      if (!target) continue;

      if (result.lastStatusCode === SPEEDY_CANCELED_OPERATION_CODE) {
        await clearCancelled(target.orderId, target.waybillId);
        continue;
      }

      const updateData: Record<string, unknown> = {
        speedy_status: result.lastStatusString,
        speedy_status_code: result.lastStatusCode,
        speedy_last_tracked_at: now,
      };

      // If delivered, also update order status
      if (isFinalStatus(result.lastStatusCode) && result.lastStatusCode === -14) {
        updateData.status = 'delivered';
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', target.orderId);

      if (!updateError) updated++;
    }

    return NextResponse.json({
      message: 'Tracking sync complete',
      totalOrders: ordersToTrack.length,
      parcelsTracked: allParcelIds.length,
      updated,
      cleared,
    });
  } catch (error) {
    console.error('Tracking sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tracking sync failed' },
      { status: 500 },
    );
  }
}
