import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { getOrderById, updateOrderStatus } from '@/lib/data';
import { isValidTransition } from '@/lib/order';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify authenticated session
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }

    // 2. Get order
    const { id: orderId } = await params;
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    // 3. Verify ownership — customer can only confirm their own orders
    if (order.user_id !== session.userId) {
      return NextResponse.json({ error: 'Нямате достъп до тази поръчка.' }, { status: 403 });
    }

    // 4. Validate transition — must be shipped → delivered
    if (order.status !== 'shipped') {
      // Idempotency: if already delivered, return success
      if (order.status === 'delivered') {
        return NextResponse.json({ success: true, order, alreadyDelivered: true });
      }
      return NextResponse.json(
        { error: `Поръчката не е в статус "Изпратена". Текущ статус: "${order.status}".` },
        { status: 400 },
      );
    }

    // Double-check with centralized transition map (defence in depth)
    if (!isValidTransition('shipped', 'delivered')) {
      return NextResponse.json(
        { error: 'Невалиден преход на статус.' },
        { status: 400 },
      );
    }

    // 5. Perform the status update
    const updated = await updateOrderStatus(
      orderId,
      'delivered',
      session.userId,
      'Потвърдено от клиента',
    );

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('Error confirming delivery:', err);
    return NextResponse.json(
      { error: 'Грешка при потвърждаване на доставката.' },
      { status: 500 },
    );
  }
}
