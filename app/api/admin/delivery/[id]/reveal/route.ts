import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { revealCycle, getDeliveryCycleById } from '@/lib/data';
import { revalidateDataTag, TAG_DELIVERY, TAG_SITE_CONFIG } from '@/lib/data/cache-tags';

// ============================================================================
// POST /api/admin/delivery/:id/reveal — Reveal cycle contents
// ============================================================================

export async function POST(
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

    // Validate cycle is in delivered status
    const existing = await getDeliveryCycleById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Цикълът не е намерен.' }, { status: 404 });
    }
    if (existing.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Само доставени цикли могат да бъдат разкрити.' },
        { status: 400 },
      );
    }
    if (existing.is_revealed) {
      return NextResponse.json(
        { error: 'Цикълът вече е разкрит.' },
        { status: 400 },
      );
    }

    const cycle = await revealCycle(id);
    revalidateDataTag(TAG_DELIVERY, TAG_SITE_CONFIG);
    return NextResponse.json({ success: true, cycle });
  } catch (err) {
    console.error('Error revealing cycle:', err);
    const message = err instanceof Error ? err.message : 'Грешка при разкриване на цикъла.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
