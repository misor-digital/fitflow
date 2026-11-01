/**
 * Speedy Courier Pickup
 *
 * Requests a courier visit (POST /pickup) for waybills created in pickup mode
 * and records it in speedy_pickup_requests. Once an order is linked to a pickup
 * request its waybill is no longer cancellable through the system.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPickupSkipReason, type PickupSkipReason } from '@/lib/constants/speedy';
import { getPickupTerms, requestPickup, SpeedyApiError } from './client';
import { getSpeedyPickupDefaults, getSpeedySenderConfig } from './config';
import {
  HHMM_PATTERN,
  isValidYmd,
  normalizeHHmm,
  nowSofiaHHmm,
  todaySofia,
  toSpeedyDateTime,
} from './dates';
import type { PickupRequestParams, PickupResponse } from './types';

export { sofiaOffset, toSpeedyDateTime, todaySofia } from './dates';

// ============================================================================
// Types
// ============================================================================

export class PickupRequestError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PickupRequestError';
  }
}

export interface PickupCutoff {
  /** YYYY-MM-DD */
  date: string;
  /** Speedy date-time (yyyy-MM-dd'T'HH:mm:ssZ) until which the pickup can be requested */
  cutoff: string;
}

export interface RequestPickupInput {
  cycleId?: string;
  orderIds?: string[];
  pickupDate: string;
  visitEndTime: string;
  contactName?: string;
  phoneNumber?: string;
  actorUserId: string;
}

export interface PickupOrderRef {
  orderId: string;
  orderNumber: string;
  waybillId: string;
}

export interface PickupSkippedOrder {
  orderId: string;
  orderNumber: string;
  reason: PickupSkipReason;
}

export interface RequestPickupResult {
  requestId: string;
  speedyOrderIds: number[];
  pickupPeriodFrom: string | null;
  pickupPeriodTo: string | null;
  included: PickupOrderRef[];
  skipped: PickupSkippedOrder[];
  unconfirmed: string[];
  warning?: string;
}

const PHONE_PATTERN = /^\+?[0-9 ]{6,20}$/;

// ============================================================================
// Helpers
// ============================================================================

/** Parse a Speedy date-time (`+0200` offsets) into a Date. */
function parseSpeedyDateTime(value: string): Date | null {
  const iso = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time);
}

function speedyErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Days on which Speedy accepts a pickup request, starting from `startingDate` (default today).
 * Days that are missing from the response are not available for pickup.
 */
export async function getPickupCutoffs(startingDate?: string): Promise<PickupCutoff[]> {
  const config = await getSpeedySenderConfig();
  const response = await getPickupTerms({
    serviceId: config.serviceId,
    ...(startingDate ? { startingDate } : {}),
    sender: { clientId: config.clientId },
    senderHasPayment: true,
  });
  return (response.cutoffs ?? []).map((cutoff) => ({ date: cutoff.slice(0, 10), cutoff }));
}

/**
 * Request a Speedy courier pickup for the eligible waybills of a cycle or explicit orders.
 */
export async function requestPickupForOrders(input: RequestPickupInput): Promise<RequestPickupResult> {
  // 1. Validate input
  const today = todaySofia();
  if (!isValidYmd(input.pickupDate) || input.pickupDate < today) {
    throw new PickupRequestError('Невалидна дата за взимане.', 400);
  }
  if (typeof input.visitEndTime !== 'string' || !HHMM_PATTERN.test(input.visitEndTime)) {
    throw new PickupRequestError('Невалиден краен час за посещение (ЧЧ:ММ).', 400);
  }
  const hasCycle = typeof input.cycleId === 'string' && input.cycleId.length > 0;
  const hasOrderIds =
    Array.isArray(input.orderIds) &&
    input.orderIds.length > 0 &&
    input.orderIds.every((id) => typeof id === 'string' && id.length > 0);
  if (hasCycle === hasOrderIds) {
    throw new PickupRequestError('Задължително е точно едно от cycleId или orderIds.', 400);
  }
  const contactName = input.contactName?.trim() || undefined;
  if (contactName && contactName.length > 60) {
    throw new PickupRequestError('Лицето за контакт трябва да е до 60 символа.', 400);
  }
  const phone = input.phoneNumber?.trim() || undefined;
  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new PickupRequestError('Невалиден телефон.', 400);
  }
  const visitEndTime = normalizeHHmm(input.visitEndTime);

  // 2. Validate the date against Speedy pickup terms
  let cutoffs: PickupCutoff[];
  try {
    cutoffs = await getPickupCutoffs(input.pickupDate);
  } catch (err) {
    console.error('[Speedy Pickup] pickup/terms failed', {
      code: err instanceof SpeedyApiError ? err.code : undefined,
      errorId: err instanceof SpeedyApiError ? err.errorId : undefined,
      message: speedyErrorMessage(err),
    });
    throw new PickupRequestError(`Speedy: ${speedyErrorMessage(err)}`, 502);
  }
  const term = cutoffs.find((c) => c.date === input.pickupDate);
  const cutoffTime = term ? parseSpeedyDateTime(term.cutoff) : null;
  const pastCutoff = input.pickupDate === today && (!cutoffTime || Date.now() >= cutoffTime.getTime());
  if (!term || pastCutoff) {
    throw new PickupRequestError(
      'Избраната дата не е налична за взимане. Изберете от предложените дати.',
      422,
    );
  }

  // 3. Load candidate orders and partition them
  let query = supabaseAdmin
    .from('orders')
    .select('id, order_number, speedy_waybill_id, speedy_status, speedy_sender_mode, speedy_pickup_request_id')
    .neq('status', 'cancelled')
    .not('speedy_waybill_id', 'is', null);
  query = hasCycle ? query.eq('delivery_cycle_id', input.cycleId!) : query.in('id', input.orderIds!);

  const { data: candidates, error: fetchError } = await query;
  if (fetchError) {
    console.error('[Speedy Pickup] Failed to load orders', fetchError);
    throw new PickupRequestError('Грешка при извличане на поръчки.', 500);
  }

  const eligibleIds: string[] = [];
  const skipped: PickupSkippedOrder[] = [];
  for (const order of candidates ?? []) {
    const reason = getPickupSkipReason(order);
    if (reason) {
      skipped.push({ orderId: order.id, orderNumber: order.order_number, reason });
    } else {
      eligibleIds.push(order.id);
    }
  }

  if (eligibleIds.length === 0) {
    throw new PickupRequestError('Няма товарителници за заявка за куриер.', 409, { skipped });
  }

  // 4. Create the pickup request row
  const defaults = await getSpeedyPickupDefaults();
  const { data: requestRow, error: insertError } = await supabaseAdmin
    .from('speedy_pickup_requests')
    .insert({
      status: 'pending',
      delivery_cycle_id: hasCycle ? input.cycleId! : null,
      pickup_date: input.pickupDate,
      visit_end_time: visitEndTime,
      contact_name: contactName ?? null,
      phone_number: phone ?? null,
      visit_fee_eur: defaults.visitFeeEur,
      requested_by: input.actorUserId,
    })
    .select('id')
    .single();

  if (insertError || !requestRow) {
    console.error('[Speedy Pickup] Failed to create pickup request row', insertError);
    throw new PickupRequestError('Грешка при създаване на заявката за куриер.', 500);
  }
  const requestId = requestRow.id;

  async function markFailed(errorMessage: string) {
    const { error } = await supabaseAdmin
      .from('speedy_pickup_requests')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', requestId);
    if (error) console.error('[Speedy Pickup] Failed to mark request as failed', { requestId, error });
  }

  // 5. Atomically claim the eligible orders (guards against concurrent requests)
  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .from('orders')
    .update({ speedy_pickup_request_id: requestId })
    .in('id', eligibleIds)
    .is('speedy_pickup_request_id', null)
    .eq('speedy_sender_mode', 'pickup')
    .select('id, order_number, speedy_waybill_id');

  if (claimError) {
    console.error('[Speedy Pickup] Failed to claim orders', { requestId, error: claimError });
    await markFailed('claim failed');
    throw new PickupRequestError('Грешка при заключване на поръчките.', 500);
  }

  const claimed: PickupOrderRef[] = (claimedRows ?? [])
    .filter((r) => !!r.speedy_waybill_id)
    .map((r) => ({ orderId: r.id, orderNumber: r.order_number, waybillId: r.speedy_waybill_id! }));

  if (claimed.length === 0) {
    await markFailed('nothing claimed');
    throw new PickupRequestError(
      'Товарителниците вече са включени в друга заявка за куриер. Обновете страницата.',
      409,
      { skipped },
    );
  }
  const claimedIds = claimed.map((c) => c.orderId);

  // 6. Call Speedy
  const pickupTime = input.pickupDate === today ? nowSofiaHHmm().time : '09:00';
  const params: PickupRequestParams = {
    pickupDateTime: toSpeedyDateTime(input.pickupDate, pickupTime),
    autoAdjustPickupDate: false,
    pickupScope: 'EXPLICIT_SHIPMENT_ID_LIST',
    explicitShipmentIdList: claimed.map((c) => c.waybillId),
    visitEndTime,
    ...(contactName ? { contactName } : {}),
    ...(phone ? { phoneNumber: { number: phone.replace(/\s+/g, '') } } : {}),
  };

  let response: PickupResponse;
  try {
    response = await requestPickup(params);
  } catch (err) {
    // 8. Speedy rejected the request — release the claim so the orders can be retried
    const message = speedyErrorMessage(err);
    console.error('[Speedy Pickup] Speedy rejected pickup request', {
      requestId,
      code: err instanceof SpeedyApiError ? err.code : undefined,
      errorId: err instanceof SpeedyApiError ? err.errorId : undefined,
      message,
    });
    const { error: releaseError } = await supabaseAdmin
      .from('orders')
      .update({ speedy_pickup_request_id: null })
      .in('id', claimedIds)
      .eq('speedy_pickup_request_id', requestId);
    if (releaseError) {
      console.error('[Speedy Pickup] Failed to release claimed orders', { requestId, error: releaseError });
    }
    await markFailed(message);
    throw new PickupRequestError(
      err instanceof SpeedyApiError
        ? `Speedy: ${message}`
        : 'Грешка при връзка със Speedy. Проверете в Speedy дали куриерът е заявен.',
      502,
    );
  }

  // 7. Success — persist the result. On DB failure keep the claim (orders must stay locked).
  const speedyOrders = response.orders ?? [];
  const speedyOrderIds = speedyOrders.map((o) => o.id);
  const fromTimes = speedyOrders
    .map((o) => (o.pickupPeriodFrom ? parseSpeedyDateTime(o.pickupPeriodFrom) : null))
    .filter((d): d is Date => d !== null);
  const toTimes = speedyOrders
    .map((o) => (o.pickupPeriodTo ? parseSpeedyDateTime(o.pickupPeriodTo) : null))
    .filter((d): d is Date => d !== null);
  const pickupPeriodFrom = fromTimes.length
    ? new Date(Math.min(...fromTimes.map((d) => d.getTime()))).toISOString()
    : null;
  const pickupPeriodTo = toTimes.length
    ? new Date(Math.max(...toTimes.map((d) => d.getTime()))).toISOString()
    : null;

  const confirmedIds = new Set(speedyOrders.flatMap((o) => o.shipmentIds ?? []));
  const unconfirmed = claimed.map((c) => c.waybillId).filter((id) => !confirmedIds.has(id));
  if (unconfirmed.length > 0) {
    console.warn('[Speedy Pickup] Waybills missing from Speedy pickup response', {
      requestId,
      speedyOrderIds,
      unconfirmed,
    });
  }

  const [{ error: rowError }, { error: ordersError }] = await Promise.all([
    supabaseAdmin
      .from('speedy_pickup_requests')
      .update({
        status: 'requested',
        speedy_order_ids: speedyOrderIds,
        pickup_period_from: pickupPeriodFrom,
        pickup_period_to: pickupPeriodTo,
        shipment_count: claimed.length,
      })
      .eq('id', requestId),
    supabaseAdmin
      .from('orders')
      .update({ speedy_pickup_requested_at: new Date().toISOString() })
      .in('id', claimedIds),
  ]);

  let warning: string | undefined;
  if (rowError || ordersError) {
    console.error('[Speedy Pickup] Courier requested but DB update failed', {
      requestId,
      speedyOrderIds,
      rowError,
      ordersError,
    });
    warning = 'Куриерът е заявен, но записът не е пълен — проверете в Speedy.';
  }

  console.log(
    `[Speedy Pickup] Request ${requestId} — ${claimed.length} waybill(s) for ${input.pickupDate}, Speedy orders ${speedyOrderIds.join(', ')} (by ${input.actorUserId})`,
  );

  return {
    requestId,
    speedyOrderIds,
    pickupPeriodFrom,
    pickupPeriodTo,
    included: claimed,
    skipped,
    unconfirmed,
    ...(warning ? { warning } : {}),
  };
}
