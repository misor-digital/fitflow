import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateLabelsInBatches, mergePdfBuffers, SpeedyApiError } from '@/lib/delivery/speedy';
import type { LabelFormat } from '@/lib/delivery/speedy';

const VALID_FORMATS: LabelFormat[] = ['A4', 'A6', 'A4_4xA6'];

/**
 * POST /api/admin/speedy/labels
 *
 * Admin-only. Generate PDF shipping labels for orders.
 * Body: { orderIds: string[], format?: LabelFormat }
 *    OR { cycleId: string, format?: LabelFormat }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderIds, cycleId, format = 'A6' } = body as {
      orderIds?: string[];
      cycleId?: string;
      format?: string;
    };

    if (!VALID_FORMATS.includes(format as LabelFormat)) {
      return NextResponse.json({ error: 'Невалиден формат. Позволени: A4, A6, A4_4xA6' }, { status: 400 });
    }

    if (!orderIds && !cycleId) {
      return NextResponse.json({ error: 'Задължително е orderIds или cycleId.' }, { status: 400 });
    }

    // Fetch parcel IDs from orders
    let query = supabaseAdmin
      .from('orders')
      .select('id, order_number, speedy_parcel_ids')
      .not('speedy_parcel_ids', 'is', null);

    if (cycleId) {
      query = query.eq('delivery_cycle_id', cycleId);
    } else if (orderIds) {
      query = query.in('id', orderIds);
    }

    const { data: orders, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch orders for labels:', fetchError);
      return NextResponse.json({ error: 'Грешка при извличане на поръчки.' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Няма поръчки с товарителници за печат.' },
        { status: 404 },
      );
    }

    // Collect all parcel IDs
    const allParcelIds = orders.flatMap((o) => o.speedy_parcel_ids ?? []);

    if (allParcelIds.length === 0) {
      return NextResponse.json({ error: 'Няма товарителници за печат.' }, { status: 404 });
    }

    // Generate labels (with batching if needed)
    const pdfBuffers = await generateLabelsInBatches(allParcelIds, format as LabelFormat);
    const mergedPdf = await mergePdfBuffers(pdfBuffers);

    return new Response(Buffer.from(mergedPdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="labels-${Date.now()}.pdf"`,
        'Content-Length': String(mergedPdf.byteLength),
      },
    });
  } catch (error) {
    console.error('Label generation error:', error);

    if (error instanceof SpeedyApiError) {
      return NextResponse.json(
        { error: `Speedy API грешка: ${error.message}`, details: error.responseBody },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при генериране на етикети.' },
      { status: 500 },
    );
  }
}
