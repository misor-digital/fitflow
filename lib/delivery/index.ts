/**
 * Delivery Domain Module
 *
 * Centralized exports for delivery cycle types, date calculation, and formatting.
 * Import from '@/lib/delivery' instead of individual files.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  DeliveryConfig,
  DeliveryCycleWithItems,
  DeliveryCycleDerivedState,
  ItemCategory,
  DeliveryCycleRow,
  DeliveryCycleItemRow,
  DeliveryCycleStatus,
} from './types';

// ============================================================================
// Functions & Constants
// ============================================================================

export {
  // Config parsing
  getDeliveryConfig,

  // Date calculation
  calculateNextDeliveryDate,
  calculateNextNDeliveryDates,
  isFirstDelivery,

  // Cycle state
  computeCycleState,

  // Formatting
  formatDeliveryDate,
  formatMonthYear,

  // Constants
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_COLORS,
  BULGARIAN_MONTHS,
} from './derived';

// ============================================================================
// Generation Logic & Cron Notifications
// ============================================================================
// NOTE: generate.ts and notifications.ts are NOT re-exported here because they
// import server-only modules (lib/data, lib/supabase/admin). Import them
// directly from '@/lib/delivery/generate' and '@/lib/delivery/notifications'
// in server-only contexts (API routes, server components).
