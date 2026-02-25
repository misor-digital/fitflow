/**
 * Admin Email Log API
 *
 * GET /api/admin/emails — Paginated email send log with filters.
 * Protected by requireAdmin().
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getEmailLog } from '@/lib/data/email-log';
import type { EmailLogStatusEnum } from '@/lib/supabase/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const emailType = searchParams.get('type') as 'transactional' | 'campaign' | null;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') as EmailLogStatusEnum | null;
    const search = searchParams.get('search')?.trim() || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const { logs, total } = await getEmailLog({
      page,
      perPage: limit,
      emailType: emailType || undefined,
      category,
      status: status || undefined,
      recipientEmail: search,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ data: logs, total, page, limit });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error in GET /api/admin/emails:', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
