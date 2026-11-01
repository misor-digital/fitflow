/**
 * Speedy constants and helpers shared by client components and server code.
 */

export const DEFAULT_CANCEL_COMMENT = 'Анулирана от администратор';
export const CANCEL_COMMENT_MAX = 1024;
export const BULK_CANCEL_MAX = 200;

/** speedy_status values for which cancellation is never attempted */
export const NON_CANCELLABLE_STATUSES = [
  'delivered',
  'returned',
  'destroyed',
  'theft',
  'canceled',
  'closed',
  'in_transit',
  'at_office',
] as const;

/** speedy_status values after which no further courier action is possible */
export const FINAL_SPEEDY_STATUSES = [
  'delivered',
  'returned',
  'destroyed',
  'theft',
  'canceled',
  'closed',
] as const;

export function isFinalSpeedyStatus(status: string | null): boolean {
  return !!status && (FINAL_SPEEDY_STATUSES as readonly string[]).includes(status);
}

export type PickupSkipReason = 'dropoff_waybill' | 'already_requested' | 'final_status';

export interface PickupCandidateOrder {
  speedy_waybill_id: string | null;
  speedy_status: string | null;
  speedy_sender_mode?: 'pickup' | 'dropoff' | null;
  speedy_pickup_request_id?: string | null;
}

/**
 * Why a waybill cannot be included in a courier pickup request, or null when it can.
 * Callers must only pass orders that have a waybill.
 */
export function getPickupSkipReason(order: PickupCandidateOrder): PickupSkipReason | null {
  if (order.speedy_pickup_request_id) return 'already_requested';
  if (isFinalSpeedyStatus(order.speedy_status)) return 'final_status';
  if (order.speedy_sender_mode !== 'pickup') return 'dropoff_waybill';
  return null;
}

export function isPickupEligible(order: PickupCandidateOrder): boolean {
  return !!order.speedy_waybill_id && getPickupSkipReason(order) === null;
}

export const PICKUP_SKIP_REASON_LABELS: Record<PickupSkipReason, string> = {
  dropoff_waybill: 'създадена за предаване в офис',
  already_requested: 'вече е заявена за куриер',
  final_status: 'пратката е в краен статус',
};

/** `YYYY-MM-DD` → `dd.MM.yyyy` */
export function formatYmdBg(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** ISO timestamp → `HH:mm` in Europe/Sofia */
export function formatSofiaTime(iso: string): string {
  return new Intl.DateTimeFormat('bg-BG', {
    timeZone: 'Europe/Sofia',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** `HH:mm–HH:mm` for a pickup period, or null when Speedy did not return one. */
export function formatPickupPeriod(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  return `${formatSofiaTime(from)}–${formatSofiaTime(to)}`;
}

export interface CancellableWaybillOrder {
  speedy_waybill_id: string | null;
  speedy_status: string | null;
  speedy_pickup_request_id?: string | null;
}

/** Whether the order's waybill may be cancelled via the Speedy API. */
export function isWaybillCancellable(order: CancellableWaybillOrder): boolean {
  if (!order.speedy_waybill_id) return false;
  if (order.speedy_pickup_request_id) return false;
  if (
    order.speedy_status &&
    (NON_CANCELLABLE_STATUSES as readonly string[]).includes(order.speedy_status)
  ) {
    return false;
  }
  return true;
}

// ============================================================================
// Price estimates (pickup vs drop-off comparison)
// ============================================================================

export type SenderMode = 'pickup' | 'dropoff';

export const SENDER_MODES: readonly SenderMode[] = ['pickup', 'dropoff'];

export const SENDER_MODE_LABELS: Record<SenderMode, string> = {
  pickup: 'Pick up',
  dropoff: 'Drop off',
};

/** Max orders per POST /api/admin/speedy/calculate/bulk request */
export const BULK_CALCULATE_MAX = 50;

export type CostEstimate =
  | { ok: true; costEur: number; marginEur: number }
  | { ok: false; error: string };

export type OrderCostEstimates = Record<SenderMode, CostEstimate>;

/**
 * Mode with the higher estimated margin, or null when neither estimate succeeded.
 * Ties resolve to `fallback`.
 */
export function getCheaperMode(estimates: OrderCostEstimates, fallback: SenderMode): SenderMode | null {
  const { pickup, dropoff } = estimates;
  if (pickup.ok && dropoff.ok) {
    if (pickup.marginEur === dropoff.marginEur) return fallback;
    return pickup.marginEur > dropoff.marginEur ? 'pickup' : 'dropoff';
  }
  if (pickup.ok) return 'pickup';
  if (dropoff.ok) return 'dropoff';
  return null;
}
