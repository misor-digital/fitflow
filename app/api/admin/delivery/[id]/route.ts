import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getDeliveryCycleById,
  updateDeliveryCycle,
  deleteDeliveryCycle,
} from '@/lib/data';

// ============================================================================
// PATCH /api/admin/delivery/:id — Update cycle fields
// ============================================================================

export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();

    // Validate cycle exists
    const existing = await getDeliveryCycleById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Цикълът не е намерен.' }, { status: 404 });
    }

    // Build update data (only allowed fields)
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title?.trim() || null;
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.delivery_date !== undefined) {
      // Only allow date change for upcoming cycles
      if (existing.status !== 'upcoming') {
        return NextResponse.json(
          { error: 'Датата може да бъде променена само за предстоящи цикли.' },
          { status: 400 },
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.delivery_date)) {
        return NextResponse.json(
          { error: 'Невалидна дата. Формат: YYYY-MM-DD.' },
          { status: 400 },
        );
      }
      updateData.delivery_date = body.delivery_date;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Няма данни за обновяване.' }, { status: 400 });
    }

    const cycle = await updateDeliveryCycle(id, updateData);
    return NextResponse.json({ success: true, cycle });
  } catch (err) {
    console.error('Error updating delivery cycle:', err);
    const message = err instanceof Error ? err.message : 'Грешка при обновяване на цикъл.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/admin/delivery/:id — Delete cycle
// ============================================================================

export async function DELETE(
  _request: NextRequest,
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
    await deleteDeliveryCycle(id);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Error deleting delivery cycle:', err);
    const message = err instanceof Error ? err.message : 'Грешка при изтриване на цикъл.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
