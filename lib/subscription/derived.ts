/**
 * Subscription Derived State
 *
 * Pure functions that compute state from SubscriptionRow.
 * No database calls — safe for both client and server.
 */

import type { SubscriptionRow, SubscriptionStatus } from '@/lib/supabase/types';
import type { DeliveryCycleRow } from '@/lib/supabase/types';
import type { SubscriptionDerivedState } from './types';

// ============================================================================
// Lifecycle Guards
// ============================================================================

/** Can only pause an active subscription */
export function canPause(sub: SubscriptionRow): boolean {
  return sub.status === 'active';
}

/** Can only resume a paused subscription */
export function canResume(sub: SubscriptionRow): boolean {
  return sub.status === 'paused';
}

/** Can cancel an active or paused subscription */
export function canCancel(sub: SubscriptionRow): boolean {
  return sub.status === 'active' || sub.status === 'paused';
}

// ============================================================================
// Full Derived State
// ============================================================================

/**
 * Compute all derived booleans from the current subscription status.
 */
export function computeSubscriptionState(sub: SubscriptionRow): SubscriptionDerivedState {
  const isActive = sub.status === 'active';
  const isPaused = sub.status === 'paused';
  const isCancelled = sub.status === 'cancelled';

  return {
    canPause: isActive,
    canResume: isPaused,
    canCancel: isActive || isPaused,
    canEditPreferences: isActive || isPaused,
    canEditAddress: isActive || isPaused,
    canChangeFrequency: isActive,
    isActive,
    isPaused,
    isCancelled,
  };
}

// ============================================================================
// Cycle Inclusion Logic
// ============================================================================

/**
 * Determine whether a subscription should be included in a delivery cycle.
 *
 * Rules:
 * - Paused / cancelled / expired → always excluded
 * - Monthly frequency → included in every cycle
 * - Seasonal frequency → included every 3rd cycle from last delivery
 *   - If never delivered (last_delivered_cycle_id is null), include in first
 *     available cycle on or after the subscription's first_cycle_id
 *   - Otherwise, include when the gap between last delivered cycle and
 *     current cycle (by index in allCyclesSorted) is >= 3
 */
export function shouldIncludeInCycle(
  sub: SubscriptionRow,
  currentCycle: DeliveryCycleRow,
  allCyclesSorted: DeliveryCycleRow[],
): boolean {
  // Only active subscriptions get orders
  if (sub.status !== 'active') return false;

  // Monthly subscribers are included in every cycle
  if (sub.frequency === 'monthly') return true;

  // Seasonal logic
  if (sub.frequency === 'seasonal') {
    // Never delivered — include in first available cycle on or after first_cycle_id
    if (sub.last_delivered_cycle_id === null) {
      if (!sub.first_cycle_id) return true; // No first_cycle_id constraint — include
      const firstCycle = allCyclesSorted.find((c) => c.id === sub.first_cycle_id);
      if (!firstCycle) return true; // first_cycle deleted — include
      // Include if current cycle is at or after the first cycle by date
      return currentCycle.delivery_date >= firstCycle.delivery_date;
    }

    // Find the last delivered cycle
    const lastDeliveredCycle = allCyclesSorted.find(
      (c) => c.id === sub.last_delivered_cycle_id,
    );

    // If last delivered cycle not found (deleted/archived), include to be safe
    if (!lastDeliveredCycle) return true;

    // Count cycles between last_delivered and current by date order
    // This is resilient to deleted/archived cycles in the gap
    const cyclesBetween = allCyclesSorted.filter(
      (c) =>
        c.delivery_date > lastDeliveredCycle.delivery_date &&
        c.delivery_date <= currentCycle.delivery_date,
    ).length;

    // Include when 3 or more cycles have passed since last delivery
    return cyclesBetween >= 3;
  }

  // Unknown frequency — exclude
  return false;
}

// ============================================================================
// Status Labels & Colors (Bulgarian)
// ============================================================================

/** Bulgarian labels for each subscription status */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Активен',
  paused: 'На пауза',
  cancelled: 'Отказан',
  expired: 'Изтекъл',
};

/** Tailwind badge classes for each subscription status */
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// Frequency Labels (Bulgarian)
// ============================================================================

/** Bulgarian labels for subscription frequencies */
export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Всеки месец',
  seasonal: 'На всеки 3 месеца',
};

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format a human-readable subscription summary.
 *
 * @param sub - The subscription row
 * @param boxTypeNames - Map of box_type id → display name
 * @returns E.g. "Премиум (всеки месец)" or "Стандартна (на всеки 3 месеца)"
 */
export function formatSubscriptionSummary(
  sub: SubscriptionRow,
  boxTypeNames: Record<string, string>,
): string {
  const boxName = boxTypeNames[sub.box_type] ?? sub.box_type;
  const freqLabel = FREQUENCY_LABELS[sub.frequency] ?? sub.frequency;
  return `${boxName} (${freqLabel.toLowerCase()})`;
}
