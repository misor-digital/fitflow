import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { createDeliveryCycle, getDeliveryCycles } from '@/lib/data';

// ============================================================================
// POST /api/admin/delivery — Create delivery cycle
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const { delivery_date, title } = body;

    // 3. Validate delivery_date
    if (!delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) {
      return NextResponse.json(
        { error: 'Невалидна дата. Формат: YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    // 4. Check for duplicate date
    const existing = await getDeliveryCycles();
    const duplicate = existing.find((c) => c.delivery_date === delivery_date);
    if (duplicate) {
      return NextResponse.json(
        { error: `Вече съществува цикъл за дата ${delivery_date}.` },
        { status: 409 },
      );
    }

    // 5. Create cycle
    const cycle = await createDeliveryCycle({
      delivery_date,
      title: title?.trim() || null,
    });

    return NextResponse.json({ success: true, cycle }, { status: 201 });
  } catch (err) {
    console.error('Error creating delivery cycle:', err);
    const message = err instanceof Error ? err.message : 'Грешка при създаване на цикъл.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
