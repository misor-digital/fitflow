import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrderById } from '@/lib/data';
import { CANCEL_COMMENT_MAX, isWaybillCancellable } from '@/lib/constants/speedy';
import { cancelShipment, SpeedyApiError } from './client';
import { mapCancelError } from './errors';

export type CancelOrderWaybillFailureReason =
  | 'invalid_comment'
  | 'not_found'
  | 'no_waybill'
  | 'not_cancellable'
  | 'pickup_requested'
  | 'speedy_error'
  | 'db_error';

export type CancelOrderWaybillResult =
  | { ok: true; orderId: string; orderNumber: string; waybillId: string }
  | {
      ok: false;
      orderId: string;
      orderNumber?: string;
      waybillId?: string;
      reason: CancelOrderWaybillFailureReason;
      message: string;
      httpStatus: number;
    };

export interface CancelActor {
  userId: string;
  name: string;
}

export const INVALID_CANCEL_COMMENT_MESSAGE = `Причината за анулиране е задължителна (до ${CANCEL_COMMENT_MAX} символа).`;

/** Trim and validate a cancellation comment; returns null when empty or too long. */
export function normalizeCancelComment(comment: unknown): string | null {
  if (typeof comment !== 'string') return null;
  const trimmed = comment.trim();
  if (trimmed.length < 1 || trimmed.length > CANCEL_COMMENT_MAX) return null;
  return trimmed;
}

/**
 * Cancel a Speedy waybill by shipment (waybill) id.
 * Only works while the shipment has not been ordered for pickup / collected.
 */
export async function cancelWaybill(shipmentId: string, comment: string): Promise<void> {
  await cancelShipment({ shipmentId, comment });
}

/**
 * Cancel the waybill of a single order and clear its Speedy data so a new
 * waybill can be created. Shared by the single and bulk cancel routes.
 */
export async function cancelOrderWaybill(
  orderId: string,
  comment: string,
  actor: CancelActor,
): Promise<CancelOrderWaybillResult> {
  const normalizedComment = normalizeCancelComment(comment);
  if (!normalizedComment) {
    return {
      ok: false,
      orderId,
      reason: 'invalid_comment',
      message: INVALID_CANCEL_COMMENT_MESSAGE,
      httpStatus: 400,
    };
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return {
      ok: false,
      orderId,
      reason: 'not_found',
      message: 'Поръчката не е намерена.',
      httpStatus: 404,
    };
  }

  const orderNumber = order.order_number;
  const waybillId = order.speedy_waybill_id;

  if (!waybillId) {
    return {
      ok: false,
      orderId,
      orderNumber,
      reason: 'no_waybill',
      message: 'Поръчката няма създадена товарителница.',
      httpStatus: 400,
    };
  }

  if (!isWaybillCancellable(order)) {
    return {
      ok: false,
      orderId,
      orderNumber,
      waybillId,
      reason: 'not_cancellable',
      message: 'Товарителницата не може да бъде анулирана в текущия ѝ статус.',
      httpStatus: 409,
    };
  }

  try {
    await cancelWaybill(waybillId, normalizedComment);
  } catch (err) {
    console.error('[Speedy Cancel] Speedy rejected cancellation', {
      orderId,
      waybillId,
      code: err instanceof SpeedyApiError ? err.code : undefined,
      errorId: err instanceof SpeedyApiError ? err.errorId : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      orderId,
      orderNumber,
      waybillId,
      reason: 'speedy_error',
      message: mapCancelError(err),
      httpStatus: 422,
    };
  }

  // Clear waybill data from order (so it can be recreated)
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      speedy_waybill_id: null,
      speedy_parcel_ids: null,
      speedy_created_at: null,
      speedy_status: 'canceled',
      speedy_status_code: null,
      speedy_last_tracked_at: null,
      delivery_fee_actual_eur: null,
    })
    .eq('id', orderId);

  if (updateError) {
    console.error('[Speedy Cancel] Failed to clear waybill data after cancellation', {
      orderId,
      waybillId,
      error: updateError,
    });
    return {
      ok: false,
      orderId,
      orderNumber,
      waybillId,
      reason: 'db_error',
      message: 'Товарителницата е анулирана в Speedy, но данните не бяха изчистени.',
      httpStatus: 500,
    };
  }

  console.log(
    `[Speedy Cancel] Order ${orderNumber} (${orderId}) — waybill ${waybillId} canceled by ${actor.name} (${actor.userId}). Comment: ${normalizedComment}`,
  );

  return { ok: true, orderId, orderNumber, waybillId };
}
