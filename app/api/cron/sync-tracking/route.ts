import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { trackParcelsBulk, isFinalStatus } from '@/lib/delivery/speedy';

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
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch orders that need tracking (have waybill, non-final status)
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, speedy_parcel_ids, speedy_status')
      .not('speedy_waybill_id', 'is', null)
      .not('speedy_parcel_ids', 'is', null);

    if (error) {
      console.error('Failed to fetch orders for tracking sync:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // Filter out orders with final statuses
    const ordersToTrack = (orders ?? []).filter(
      (o) => !o.speedy_status || !FINAL_DB_STATUSES.includes(o.speedy_status),
    );

    if (ordersToTrack.length === 0) {
      return NextResponse.json({ message: 'No orders to track', tracked: 0 });
    }

    // Build parcel-to-order mapping
    const parcelToOrder = new Map<string, string>();
    for (const order of ordersToTrack) {
      for (const parcelId of order.speedy_parcel_ids ?? []) {
        parcelToOrder.set(parcelId, order.id);
      }
    }

    const allParcelIds = Array.from(parcelToOrder.keys());

    // Track all parcels (batched internally)
    const trackingResults = await trackParcelsBulk(allParcelIds);

    // Update orders with tracking results
    let updated = 0;
    const now = new Date().toISOString();

    for (const result of trackingResults) {
      const orderId = parcelToOrder.get(result.parcelId);
      if (!orderId) continue;

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
        .eq('id', orderId);

      if (!updateError) updated++;
    }

    return NextResponse.json({
      message: 'Tracking sync complete',
      totalOrders: ordersToTrack.length,
      parcelsTracked: allParcelIds.length,
      updated,
    });
  } catch (error) {
    console.error('Tracking sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tracking sync failed' },
      { status: 500 },
    );
  }
}
