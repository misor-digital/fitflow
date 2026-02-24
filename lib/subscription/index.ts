/**
 * Subscription Domain Module
 *
 * Centralized exports for all subscription-related types, utilities, and logic.
 * Import from '@/lib/subscription' instead of individual files.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  SubscriptionDerivedState,
  SubscriptionPreferencesUpdate,
  BatchGenerationResult,
  SubscriptionAction,
  SubscriptionWithDelivery,
  SubscriptionRow,
  SubscriptionStatus,
  SubscriptionHistoryRow,
  DeliveryCycleRow,
} from './types';

// ============================================================================
// Derived State
// ============================================================================

export {
  canPause,
  canResume,
  canCancel,
  computeSubscriptionState,
  shouldIncludeInCycle,
  formatSubscriptionSummary,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  FREQUENCY_LABELS,
} from './derived';

// ============================================================================
// Validation
// ============================================================================

export {
  validatePreferenceUpdate,
  validateFrequencyChange,
  validateCancellationReason,
} from './validation';
