import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getContractClients } from '@/lib/delivery/speedy';

/**
 * GET /api/admin/speedy/contract
 *
 * Admin-only. Returns Speedy contract client info (clientId, name, address).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const result = await getContractClients();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Speedy contract clients error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при извличане на данни от Speedy.' },
      { status: 500 },
    );
  }
}
