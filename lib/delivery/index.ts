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
