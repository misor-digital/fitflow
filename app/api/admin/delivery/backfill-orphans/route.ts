import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { backfillOrphanedSubscriptions, backfillOrphanedOrders } from '@/lib/data';
import { revalidateDataTag, TAG_SUBSCRIPTIONS, TAG_ORDERS } from '@/lib/data/cache-tags';

// ============================================================================
// POST /api/admin/delivery/backfill-orphans
// Assign orphaned subscriptions and orders to earliest upcoming cycle
// ============================================================================

export async function POST(): Promise<NextResponse> {
  try {
    // Auth: staff with management role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    const [subsResult, ordersResult] = await Promise.all([
      backfillOrphanedSubscriptions(),
      backfillOrphanedOrders(),
    ]);
    revalidateDataTag(TAG_SUBSCRIPTIONS, TAG_ORDERS);

    return NextResponse.json({
      subscriptions: subsResult.count,
      orders: ordersResult.count,
      cycleId: subsResult.cycleId,
      cycleDate: subsResult.cycleDate,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Неуспешно назначаване.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
