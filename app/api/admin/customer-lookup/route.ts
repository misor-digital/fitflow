/**
 * Admin API — Customer Lookup
 *
 * GET /api/admin/customer-lookup?email=...
 *
 * Checks whether a user account exists for the given email address.
 * Used by the admin panel to decide whether to create a new customer
 * before converting a preorder.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
    // TODO: For large user bases, switch to listUsers({ filter }) or a
    // direct user_profiles table query instead of fetching all users.
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (user) {
      return NextResponse.json({
        exists: true,
        userId: user.id,
        fullName: user.user_metadata?.full_name ?? null,
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
