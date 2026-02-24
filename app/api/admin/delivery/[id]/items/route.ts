import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getCycleItems, createCycleItem, getDeliveryCycleById } from '@/lib/data';

// ============================================================================
// GET /api/admin/delivery/:id/items — List items for a cycle
// ============================================================================

export async function GET(
  _request: NextRequest,
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

    const { id } = await params;
    const items = await getCycleItems(id);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('Error fetching cycle items:', err);
    return NextResponse.json(
      { error: 'Грешка при зареждане на артикулите.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/admin/delivery/:id/items — Create item
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
    const { name, description, category, image_url, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
    }

    const item = await createCycleItem({
      delivery_cycle_id: cycleId,
      name: name.trim(),
      description: description?.trim() || null,
      category: category || null,
      image_url: image_url || null,
      sort_order: sort_order ?? undefined,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    console.error('Error creating cycle item:', err);
    const message = err instanceof Error ? err.message : 'Грешка при създаване на артикул.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
