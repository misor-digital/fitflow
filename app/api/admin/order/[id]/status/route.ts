import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { updateOrderStatus, getOrderById, getOrderStatusHistory } from '@/lib/data';
import type { OrderStatus } from '@/lib/supabase/types';

// ============================================================================
// Allowed status transitions (server-side enforcement)
// ============================================================================

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

// ============================================================================
// PATCH /api/admin/order/:id/status — Update order status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    // 2. Parse params + body
    const { id: orderId } = await params;
    const body = await request.json();
    const newStatus = body.status as OrderStatus;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null;

    // 3. Validate status value
    if (!newStatus || !ALL_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Невалиден статус.' },
        { status: 400 },
      );
    }

    // 4. Get current order
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    // 5. Validate transition
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Невалиден преход от "${order.status}" към "${newStatus}".`,
        },
        { status: 400 },
      );
    }

    // 6. Perform update
    const updated = await updateOrderStatus(orderId, newStatus, session.userId, notes || null);

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('Error updating order status:', err);
    return NextResponse.json(
      { error: 'Грешка при обновяване на статуса.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/admin/order/:id/status — Get order status history
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    // 2. Get history
    const { id: orderId } = await params;
    const history = await getOrderStatusHistory(orderId);

    return NextResponse.json({ history });
  } catch (err) {
    console.error('Error fetching order status history:', err);
    return NextResponse.json(
      { error: 'Грешка при зареждане на историята.' },
      { status: 500 },
    );
  }
}
