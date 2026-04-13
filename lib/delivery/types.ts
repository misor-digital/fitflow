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
  orderCutoffDisplayDays: number; // days before cutoff to show countdown (default 5)
  cutoffWidgetsEnabled: boolean; // master toggle for banner + popup (default true)
  cutoffBannerEnabled: boolean; // sliding banner toggle (default true)
  cutoffPopupEnabled: boolean; // floating countdown popup toggle (default true)
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
  isAcceptingOrders: boolean; // order_cutoff_at > now
  formattedCutoffAt: string; // DD.MM.YYYY HH:MM
  daysUntilCutoff: number | null; // null if cutoff passed
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
