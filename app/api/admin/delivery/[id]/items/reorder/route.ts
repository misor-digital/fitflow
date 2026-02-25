import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { reorderCycleItems, getDeliveryCycleById } from '@/lib/data';

// ============================================================================
// POST /api/admin/delivery/:id/items/reorder — Reorder items
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
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const { id: cycleId } = await params;

    // Verify cycle exists
    const cycle = await getDeliveryCycleById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Цикълът не е намерен.' }, { status: 404 });
    }

    const body = await request.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds трябва да е непразен масив.' },
        { status: 400 },
      );
    }

    await reorderCycleItems(cycleId, itemIds);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error reordering cycle items:', err);
    const message = err instanceof Error ? err.message : 'Грешка при пренареждане на артикулите.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
