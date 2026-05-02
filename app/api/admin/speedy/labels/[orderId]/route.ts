import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getOrderById } from '@/lib/data';
import { generateLabels, SpeedyApiError } from '@/lib/delivery/speedy';
import type { LabelFormat } from '@/lib/delivery/speedy';

const VALID_FORMATS: LabelFormat[] = ['A4', 'A6', 'A4_4xA6'];

/**
 * GET /api/admin/speedy/labels/[orderId]?format=A6
 *
 * Admin-only. Generate PDF label for a single order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const { orderId } = await params;
    const format = (request.nextUrl.searchParams.get('format') || 'A6') as string;

    if (!VALID_FORMATS.includes(format as LabelFormat)) {
      return NextResponse.json({ error: 'Невалиден формат. Позволени: A4, A6, A4_4xA6' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    if (!order.speedy_parcel_ids || order.speedy_parcel_ids.length === 0) {
      return NextResponse.json(
        { error: 'Поръчката няма създадена товарителница.' },
        { status: 400 },
      );
    }

    const pdfBuffer = await generateLabels(order.speedy_parcel_ids, format as LabelFormat);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="label-${order.order_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Single label generation error:', error);

    if (error instanceof SpeedyApiError) {
      return NextResponse.json(
        { error: `Speedy API грешка: ${error.message}`, details: error.responseBody },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при генериране на етикет.' },
      { status: 500 },
    );
  }
}
