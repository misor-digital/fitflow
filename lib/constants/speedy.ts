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
