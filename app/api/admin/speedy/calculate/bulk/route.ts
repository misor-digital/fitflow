import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BULK_CALCULATE_MAX,
  SENDER_MODES,
  type OrderCostEstimates,
} from '@/lib/constants/speedy';
import { getSpeedyPickupDefaults } from '@/lib/delivery/speedy/config';
import { estimateOrderCost, runWithConcurrency } from '@/lib/delivery/speedy/estimates';
import { loadParcelConfig, toOrderForShipment } from '@/lib/delivery/speedy/shipments';
import type { OrderRow } from '@/lib/supabase/types';

export const maxDuration = 60;

/** Parallel Speedy /calculate calls per request */
const CALCULATE_CONCURRENCY = 4;

/**
 * POST /api/admin/speedy/calculate/bulk
 *
 * Admin-only. Dry-run price calculation for orders without a waybill, in both
 * sender modes (courier pickup and office drop-off). Nothing is created in Speedy.
 * Body: { orderIds: string[] } (1..BULK_CALCULATE_MAX)
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
    const { orderIds } = body as { orderIds?: unknown };

    if (
      !Array.isArray(orderIds) ||
      orderIds.length < 1 ||
      orderIds.length > BULK_CALCULATE_MAX ||
      !orderIds.every((id) => typeof id === 'string' && id.length > 0) ||
      new Set(orderIds).size !== orderIds.length
    ) {
      return NextResponse.json(
        { error: `orderIds трябва да съдържа между 1 и ${BULK_CALCULATE_MAX} уникални идентификатора.` },
        { status: 400 },
      );
    }

    const { data, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('id', orderIds as string[])
      .neq('status', 'cancelled');

    if (fetchError) {
      console.error('Failed to fetch orders for bulk calculation:', fetchError);
      return NextResponse.json({ error: 'Грешка при извличане на поръчки.' }, { status: 500 });
    }

    const orders = (data ?? []) as OrderRow[];
    const foundIds = new Set(orders.map((o) => o.id));
    const skipped: Array<{ orderId: string; reason: 'not_found' | 'has_waybill' }> = [
      ...(orderIds as string[])
        .filter((id) => !foundIds.has(id))
        .map((orderId) => ({ orderId, reason: 'not_found' as const })),
      ...orders
        .filter((o) => o.speedy_waybill_id)
        .map((o) => ({ orderId: o.id, reason: 'has_waybill' as const })),
    ];

    const toCalculate = orders.filter((o) => !o.speedy_waybill_id).map(toOrderForShipment);
    const [parcel, pickupDefaults] = await Promise.all([loadParcelConfig(), getSpeedyPickupDefaults()]);

    const tasks = toCalculate.flatMap((order) =>
      SENDER_MODES.map((mode) => async () => ({
        orderId: order.id,
        mode,
        estimate: await estimateOrderCost(order, mode, parcel),
      })),
    );
    const estimates = await runWithConcurrency(tasks, CALCULATE_CONCURRENCY);

    const results: Record<string, OrderCostEstimates> = {};
    for (const { orderId, mode, estimate } of estimates) {
      results[orderId] = { ...results[orderId], [mode]: estimate } as OrderCostEstimates;
    }

    return NextResponse.json({
      results,
      skipped,
      visitFeeEur: pickupDefaults.visitFeeEur,
    });
  } catch (error) {
    console.error('Bulk Speedy calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при калкулация.' },
      { status: 500 },
    );
  }
}
