import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { backfillOrphanedSubscriptions } from '@/lib/data';
import { revalidateDataTag, TAG_SUBSCRIPTIONS } from '@/lib/data/cache-tags';

// ============================================================================
// POST /api/admin/delivery/backfill-orphans
// Assign orphaned subscriptions (first_cycle_id IS NULL) to earliest upcoming cycle
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

    const result = await backfillOrphanedSubscriptions();
    revalidateDataTag(TAG_SUBSCRIPTIONS);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Неуспешно назначаване.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
