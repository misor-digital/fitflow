/**
 * GET  /api/admin/emails/unsubscribes — Paginated unsubscribe list.
 * DELETE /api/admin/emails/unsubscribes — Re-subscribe an email (remove from unsubscribe list).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getUnsubscribes, removeUnsubscribe, getUnsubscribeCount } from '@/lib/email/unsubscribe';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), 100);
    const search = searchParams.get('search') ?? undefined;

    const [{ data, total }, totalCount] = await Promise.all([
      getUnsubscribes({ page, limit, search }),
      getUnsubscribeCount(),
    ]);

    return NextResponse.json({ data, total, totalCount, page, limit });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[unsubscribes GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Липсва имейл адрес.' },
        { status: 400 },
      );
    }

    await removeUnsubscribe(email, session.userId);

    return NextResponse.json({
      success: true,
      message: `${email} е абониран отново.`,
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Сървърна грешка.';
    console.error('[unsubscribes DELETE]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
