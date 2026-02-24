import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { updateDeliveryConfig } from '@/lib/data';

// ============================================================================
// PATCH /api/admin/settings/delivery — Update delivery config
// ============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Ключът е задължителен.' }, { status: 400 });
    }
    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'Стойността е задължителна.' }, { status: 400 });
    }

    await updateDeliveryConfig(key, String(value));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating delivery config:', err);
    const message = err instanceof Error ? err.message : 'Грешка при обновяване на настройките.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
