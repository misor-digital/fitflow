import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { trackParcelsBulk } from '@/lib/delivery/speedy';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/delivery/speedy/tracking';

/**
 * GET /api/delivery/tracking/[orderId]
 *
 * Customer-facing tracking endpoint.
 * User must own the order (or be staff).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: 'Необходима е автентикация.' }, { status: 401 });
    }

    const { orderId } = await params;

    // Fetch order
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, speedy_waybill_id, speedy_parcel_ids, speedy_status, speedy_status_code, speedy_last_tracked_at, status')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    // Auth check: user must own the order or be staff
    const isStaff = session.profile.user_type === 'staff';
    if (!isStaff && order.user_id !== session.userId) {
      return NextResponse.json({ error: 'Нямате достъп до тази поръчка.' }, { status: 403 });
    }

    // No waybill yet — order is still being prepared
    if (!order.speedy_waybill_id || !order.speedy_parcel_ids?.length) {
      return NextResponse.json({
        status: 'processing',
        statusLabel: 'В подготовка',
        statusColor: 'bg-blue-100 text-blue-700',
        message: 'Поръчката се подготвя за изпращане.',
        lastUpdated: null,
      });
    }

    // Check if cached status is fresh enough (< 1 hour)
    const lastTracked = order.speedy_last_tracked_at
      ? new Date(order.speedy_last_tracked_at)
      : null;
    const isStale = !lastTracked || (Date.now() - lastTracked.getTime()) > 3600_000;

    let statusCode = order.speedy_status_code;
    let statusString = order.speedy_status ?? 'created';
    let lastUpdated = order.speedy_last_tracked_at;

    // Live-track if stale
    if (isStale) {
      try {
        const results = await trackParcelsBulk(order.speedy_parcel_ids);
        if (results.length > 0) {
          const result = results[0];
          statusCode = result.lastStatusCode;
          statusString = result.lastStatusString;
          lastUpdated = new Date().toISOString();

          // Update DB with fresh data (fire-and-forget)
          supabaseAdmin
            .from('orders')
            .update({
              speedy_status: statusString,
              speedy_status_code: statusCode,
              speedy_last_tracked_at: lastUpdated,
            })
            .eq('id', orderId)
            .then(() => {});
        }
      } catch {
        // Live track failed — use cached status
      }
    }

    const statusLabel = statusCode != null
      ? (STATUS_LABELS[statusCode] ?? statusString)
      : 'Създадена';
    const statusColor = STATUS_COLORS[statusString] ?? 'bg-gray-100 text-gray-600';

    // Customer-friendly message
    const messages: Record<string, string> = {
      created: 'Товарителницата е създадена.',
      accepted: 'Пратката е приета от Speedy.',
      processing: 'Пратката се обработва.',
      in_transit: 'Пратката е на път към вас.',
      at_office: 'Пратката ви чака в офиса на Speedy.',
      delivered: 'Пратката е доставена успешно.',
      returned: 'Пратката е върната на подателя.',
      canceled: 'Пратката е анулирана.',
    };

    return NextResponse.json({
      status: statusString,
      statusLabel,
      statusColor,
      statusCode,
      message: messages[statusString] ?? 'Статусът е обновен.',
      lastUpdated,
      waybillId: order.speedy_waybill_id,
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при проследяване.' },
      { status: 500 },
    );
  }
}
