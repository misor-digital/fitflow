/**
 * Delivery Cycle Domain Types
 *
 * Types for delivery schedule management, cycle state, and content display.
 */

import type {
  DeliveryCycleRow,
  DeliveryCycleItemRow,
  DeliveryCycleStatus,
} from '@/lib/supabase/types';

// Re-export for convenience
export type { DeliveryCycleRow, DeliveryCycleItemRow, DeliveryCycleStatus };

// ============================================================================
// Config
// ============================================================================

/** Delivery schedule configuration from site_config */
export interface DeliveryConfig {
  deliveryDay: number; // 1-28, default 5
  firstDeliveryDate: string | null; // ISO date string, e.g. '2026-03-08'
  subscriptionEnabled: boolean;
  revealedBoxEnabled: boolean;
}

// ============================================================================
// Composite Types
// ============================================================================

/** A delivery cycle with its items loaded */
export interface DeliveryCycleWithItems extends DeliveryCycleRow {
  items: DeliveryCycleItemRow[];
}

// ============================================================================
// Derived State
// ============================================================================

/** Derived state for a delivery cycle */
export interface DeliveryCycleDerivedState {
  isPast: boolean; // delivery_date < today
  isUpcoming: boolean; // delivery_date >= today && status === 'upcoming'
  isRevealed: boolean; // is_revealed === true
  canReveal: boolean; // status === 'delivered' && !is_revealed
  canMarkDelivered: boolean; // status === 'upcoming'
  daysUntilDelivery: number | null; // null if past
  formattedDate: string; // DD.MM.YYYY
  monthYear: string; // "Март 2026"
}

// ============================================================================
// Display
// ============================================================================

/** Item category for display grouping */
export type ItemCategory =
  | 'protein'
  | 'supplement'
  | 'accessory'
  | 'clothing'
  | 'other';
