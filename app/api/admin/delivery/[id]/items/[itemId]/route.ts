import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getCycleItemById, updateCycleItem, deleteCycleItem } from '@/lib/data';

// ============================================================================
// PATCH /api/admin/delivery/:id/items/:itemId — Update item
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const { itemId } = await params;
    const body = await request.json();

    // Verify item exists
    const existing = await getCycleItemById(itemId);
    if (!existing) {
      return NextResponse.json({ error: 'Артикулът не е намерен.' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.image_url !== undefined) updateData.image_url = body.image_url || null;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Няма данни за обновяване.' }, { status: 400 });
    }

    const item = await updateCycleItem(itemId, updateData);
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error('Error updating cycle item:', err);
    const message = err instanceof Error ? err.message : 'Грешка при обновяване на артикул.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/admin/delivery/:id/items/:itemId — Delete item
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const { itemId } = await params;

    // Verify item exists
    const existing = await getCycleItemById(itemId);
    if (!existing) {
      return NextResponse.json({ error: 'Артикулът не е намерен.' }, { status: 404 });
    }

    await deleteCycleItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Error deleting cycle item:', err);
    const message = err instanceof Error ? err.message : 'Грешка при изтриване на артикул.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
