/**
 * GET /api/admin/emails/health — Email system health check.
 *
 * Returns system health metrics for the admin dashboard.
 * Protected by admin auth.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getSystemHealth } from '@/lib/email/monitoring';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();

    const health = await getSystemHealth();

    return NextResponse.json(health);
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    console.error('[health GET]', err);
    return NextResponse.json(
      { error: 'Грешка при проверка на системата.' },
      { status: 500 },
    );
  }
}
