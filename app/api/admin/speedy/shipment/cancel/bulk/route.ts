import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { BULK_CANCEL_MAX } from '@/lib/constants/speedy';
import {
  cancelOrderWaybill,
  normalizeCancelComment,
  INVALID_CANCEL_COMMENT_MESSAGE,
} from '@/lib/delivery/speedy/cancellation';

export const maxDuration = 60;

interface BulkCancelResultItem {
  orderId: string;
  orderNumber?: string;
  waybillId?: string;
  status: 'cancelled' | 'failed';
  /** Waybill had already been cancelled in Speedy; only our data was cleared */
  alreadyCancelled?: boolean;
  error?: string;
}

/**
 * POST /api/admin/speedy/shipment/cancel/bulk
 *
 * Admin-only. Cancels Speedy waybills for multiple orders.
 * Body: { orderIds: string[], comment: string }
 * Processes sequentially to avoid rate limits.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const body = await request.json();
    const { orderIds, comment } = body as { orderIds?: unknown; comment?: unknown };

    if (
      !Array.isArray(orderIds) ||
      orderIds.length < 1 ||
      orderIds.length > BULK_CANCEL_MAX ||
      !orderIds.every((id) => typeof id === 'string' && id.length > 0) ||
      new Set(orderIds).size !== orderIds.length
    ) {
      return NextResponse.json(
        { error: `orderIds трябва да съдържа между 1 и ${BULK_CANCEL_MAX} уникални идентификатора.` },
        { status: 400 },
      );
    }

    const normalizedComment = normalizeCancelComment(comment);
    if (!normalizedComment) {
      return NextResponse.json({ error: INVALID_CANCEL_COMMENT_MESSAGE }, { status: 400 });
    }

    const actor = {
      userId: session.userId,
      name: `${session.profile.first_name} ${session.profile.last_name}`,
    };

    const results: BulkCancelResultItem[] = [];
    let cancelled = 0;
    let failed = 0;

    for (const orderId of orderIds as string[]) {
      const result = await cancelOrderWaybill(orderId, normalizedComment, actor);
      if (result.ok) {
        results.push({
          orderId,
          orderNumber: result.orderNumber,
          waybillId: result.waybillId,
          status: 'cancelled',
          alreadyCancelled: result.alreadyCancelled,
        });
        cancelled++;
      } else {
        results.push({
          orderId,
          orderNumber: result.orderNumber,
          waybillId: result.waybillId,
          status: 'failed',
          error: result.message,
        });
        failed++;
      }
    }

    return NextResponse.json({
      total: orderIds.length,
      cancelled,
      failed,
      results,
    });
  } catch (error) {
    console.error('Bulk waybill cancellation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Грешка при масово анулиране на товарителници.' },
      { status: 500 },
    );
  }
}
