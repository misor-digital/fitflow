/**
 * GET /api/admin/feedback/[id]/responses — Paginated responses for a form
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  getFeedbackFormById,
  getResponsesByForm,
} from '@/lib/data/feedback-forms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await params;

    const form = await getFeedbackFormById(id);
    if (!form) {
      return NextResponse.json({ error: 'Формулярът не е намерен.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), 100);

    const { responses, total } = await getResponsesByForm(id, page, limit);

    return NextResponse.json({ data: responses, total, page, limit });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback/:id/responses GET]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
