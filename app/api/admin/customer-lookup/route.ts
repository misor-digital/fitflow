/**
 * Admin API - Customer Lookup
 *
 * GET /api/admin/customer-lookup?email=...
 *
 * Checks whether a user account exists for the given email address.
 * Used by the admin panel to decide whether to create a new customer
 * before converting a preorder.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getUserByEmail } from '@/lib/auth/get-user-by-email';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();

    // ---- Parse query param -----------------------------------------------
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Параметърът email е задължителен.' },
        { status: 400 },
      );
    }

    // ---- Look up user ----------------------------------------------------
    const user = await getUserByEmail(email);

    if (user) {
      const meta = user.raw_user_meta_data as Record<string, unknown> | undefined;
      const metaFullName = typeof meta?.full_name === 'string' ? meta.full_name : '';
      return NextResponse.json({
        exists: true,
        userId: user.id,
        firstName: (typeof meta?.first_name === 'string' ? meta.first_name : null)
          ?? (metaFullName.split(' ')[0] || null),
        lastName: (typeof meta?.last_name === 'string' ? meta.last_name : null)
          ?? (metaFullName.split(' ').slice(1).join(' ') || null),
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[customer-lookup]', err);
    return NextResponse.json(
      { error: 'Възникна грешка при проверка на акаунта.' },
      { status: 500 },
    );
  }
}
