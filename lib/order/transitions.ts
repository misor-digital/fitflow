/**
 * Order Status Transitions
 *
 * Single source of truth for valid order status transitions.
 * Used by admin APIs, customer APIs, cron jobs, and UI components.
 *
 * NOTE: No 'server-only' import — this module is shared between
 * server and client code.
 */

import type { OrderStatus } from '@/lib/supabase/types';

/**
 * Map of allowed status transitions.
 * Key = current status, Value = array of valid next statuses.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Get all valid next statuses for a given status.
 */
export function getAllowedTransitions(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
