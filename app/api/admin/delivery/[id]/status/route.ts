import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { markCycleDelivered, archiveCycle, getDeliveryCycleById } from '@/lib/data';

// ============================================================================
// POST /api/admin/delivery/:id/status — Change cycle status
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'mark_delivered') {
      const cycle = await markCycleDelivered(id);
      return NextResponse.json({ success: true, cycle });
    }

    if (action === 'archive') {
      await archiveCycle(id);
      const cycle = await getDeliveryCycleById(id);
      return NextResponse.json({ success: true, cycle });
    }

    return NextResponse.json(
      { error: 'Невалидно действие. Позволени: mark_delivered, archive.' },
      { status: 400 },
    );
  } catch (err) {
    console.error('Error changing cycle status:', err);
    const message = err instanceof Error ? err.message : 'Грешка при промяна на статуса.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
