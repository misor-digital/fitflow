import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getUpcomingCycle,
  getDeliveryCycleById,
  generateOrdersForCycle,
} from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';

// ============================================================================
// POST /api/admin/delivery/generate — Batch order generation for a cycle
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Step 1: Auth — support both admin auth and cron secret
    // ------------------------------------------------------------------
    const headersList = await headers();
    const authHeader = request.headers.get('authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');
    let performedBy = 'system';

    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      // Cron-triggered — proceed without staff auth
      performedBy = 'system';
    } else {
      // Admin auth required
      const session = await verifySession();
      if (!session || session.profile.user_type !== 'staff') {
        return NextResponse.json(
          { error: 'Неоторизиран достъп.' },
          { status: 401 },
        );
      }
      if (
        !session.profile.staff_role ||
        !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
      ) {
        return NextResponse.json(
          { error: 'Нямате достъп до тази операция.' },
          { status: 403 },
        );
      }
      performedBy = session.userId;
    }

    // ------------------------------------------------------------------
    // Step 2: Rate limit per IP (admin endpoints)
    // ------------------------------------------------------------------
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_generate:${ip}`, 10, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Parse body (optional cycleId)
    // ------------------------------------------------------------------
    let cycleId: string | undefined;
    try {
      const body = await request.json();
      cycleId = typeof body.cycleId === 'string' ? body.cycleId : undefined;
    } catch {
      // Empty body is fine — will auto-detect cycle
    }

    // ------------------------------------------------------------------
    // Step 4: Determine target cycle
    // ------------------------------------------------------------------
    let targetCycleId: string;

    if (cycleId) {
      // Explicit cycle — verify it exists
      const cycle = await getDeliveryCycleById(cycleId);
      if (!cycle) {
        return NextResponse.json(
          { error: 'Цикълът не е намерен.' },
          { status: 404 },
        );
      }
      targetCycleId = cycle.id;
    } else {
      // Auto-detect: earliest upcoming cycle where delivery_date <= today
      const upcomingCycle = await getUpcomingCycle();
      if (!upcomingCycle) {
        return NextResponse.json({
          message: 'Няма предстоящ цикъл за генериране.',
        });
      }

      const today = new Date().toISOString().split('T')[0];
      if (upcomingCycle.delivery_date > today) {
        return NextResponse.json({
          message: 'Няма предстоящ цикъл за генериране.',
        });
      }
      targetCycleId = upcomingCycle.id;
    }

    // ------------------------------------------------------------------
    // Step 5: Generate orders
    // ------------------------------------------------------------------
    const result = await generateOrdersForCycle(targetCycleId, performedBy);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating batch orders:', error);
    return NextResponse.json(
      { error: 'Грешка при генериране на поръчки.' },
      { status: 500 },
    );
  }
}
