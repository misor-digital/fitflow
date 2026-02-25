/**
 * Subscription Domain Types
 *
 * Types for subscription lifecycle management.
 */

import type { SubscriptionRow, SubscriptionStatus, SubscriptionHistoryRow } from '@/lib/supabase/types';
import type { DeliveryCycleRow } from '@/lib/supabase/types';

// Re-export for convenience
export type { SubscriptionRow, SubscriptionStatus, SubscriptionHistoryRow };
export type { DeliveryCycleRow };

/** Derived state computed from a subscription row */
export interface SubscriptionDerivedState {
  canPause: boolean;           // active → paused
  canResume: boolean;          // paused → active
  canCancel: boolean;          // active or paused → cancelled
  canEditPreferences: boolean; // active or paused
  canEditAddress: boolean;     // active or paused
  canChangeFrequency: boolean; // active only
  isActive: boolean;
  isPaused: boolean;
  isCancelled: boolean;
}

/** Preferences subset for updates */
export interface SubscriptionPreferencesUpdate {
  wants_personalization: boolean;
  sports?: string[] | null;
  sport_other?: string | null;
  colors?: string[] | null;
  flavors?: string[] | null;
  flavor_other?: string | null;
  dietary?: string[] | null;
  dietary_other?: string | null;
  size_upper?: string | null;
  size_lower?: string | null;
  additional_notes?: string | null;
}

/** Result of batch order generation for a cycle */
export interface BatchGenerationResult {
  cycleId: string;
  cycleDate: string;
  generated: number;
  skipped: number;      // already had order for this cycle
  excluded: number;     // paused or seasonal skip
  errors: number;
  errorDetails: Array<{ subscriptionId: string; error: string }>;
}

/** Subscription with joined user info for admin tables */
export interface SubscriptionWithUserInfo extends SubscriptionRow {
  user_email: string;
  user_full_name: string;
}

/** History action types for type safety */
export type SubscriptionAction =
  | 'created'
  | 'paused'
  | 'resumed'
  | 'cancelled'
  | 'expired'
  | 'preferences_updated'
  | 'address_changed'
  | 'frequency_changed'
  | 'order_generated';

/** Subscription with its next delivery info */
export interface SubscriptionWithDelivery extends SubscriptionRow {
  nextDeliveryDate: string | null;   // from upcoming cycle
  nextCycleId: string | null;
}
