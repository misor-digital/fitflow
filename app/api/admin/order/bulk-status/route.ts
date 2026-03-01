import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getOrderById, updateOrderStatus } from '@/lib/data';
import { revalidateDataTag, TAG_ORDERS } from '@/lib/data/cache-tags';
import type { OrderStatus } from '@/lib/supabase/types';
import { isValidTransition, ALLOWED_TRANSITIONS } from '@/lib/order';

// ============================================================================
// PATCH /api/admin/order/bulk-status — Bulk update order statuses
// ============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const orderIds: string[] = body.orderIds;
    const newStatus = body.status as OrderStatus;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null;

    // 3. Validate inputs
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Не са избрани поръчки.' }, { status: 400 });
    }
    if (orderIds.length > 100) {
      return NextResponse.json({ error: 'Максимум 100 поръчки наведнъж.' }, { status: 400 });
    }
    if (!newStatus || !Object.keys(ALLOWED_TRANSITIONS).includes(newStatus)) {
      return NextResponse.json({ error: 'Невалиден статус.' }, { status: 400 });
    }

    // 4. Process each order, collecting results
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const orderId of orderIds) {
      try {
        const order = await getOrderById(orderId);
        if (!order) {
          results.push({ id: orderId, success: false, error: 'Не е намерена.' });
          continue;
        }

        if (!isValidTransition(order.status, newStatus)) {
          results.push({
            id: orderId,
            success: false,
            error: `Невалиден преход от „${order.status}" към „${newStatus}".`,
          });
          continue;
        }

        await updateOrderStatus(orderId, newStatus, session.userId, notes || null);
        results.push({ id: orderId, success: true });
      } catch {
        results.push({ id: orderId, success: false, error: 'Грешка при обновяване.' });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (succeeded > 0) revalidateDataTag(TAG_ORDERS);

    return NextResponse.json({ succeeded, failed, results });
  } catch (err) {
    console.error('Error in bulk status update:', err);
    return NextResponse.json(
      { error: 'Грешка при масово обновяване на статусите.' },
      { status: 500 },
    );
  }
}
