/**
 * Order Derived State
 *
 * Pure functions that compute state from OrderUserInput.
 * Delegates box-type logic to @/lib/catalog/derived.
 */

import type { BoxTypeId } from '@/lib/catalog';
import type { OrderUserInput, OrderDerivedState } from './types';
import { isPremiumBox, isSubscriptionBox } from '@/lib/catalog';
import { validateOrderStep1, validateOrderStep2, validateOrderStep3 } from './validation';

// ============================================================================
// Auth Requirements
// ============================================================================

/**
 * Check if the given box type requires an authenticated user.
 * Subscription boxes require auth.
 */
export function requiresAuth(boxType: BoxTypeId | null): boolean {
  return isSubscriptionBox(boxType);
}

/**
 * Check if the given box type allows guest checkout.
 * One-time boxes allow guest checkout.
 */
export function canCheckoutAsGuest(boxType: BoxTypeId | null): boolean {
  return !isSubscriptionBox(boxType);
}

// ============================================================================
// Full Derived State
// ============================================================================

/**
 * Compute all derived state from order user input.
 * This is the main function to use in components.
 */
export function computeOrderDerivedState(input: OrderUserInput): OrderDerivedState {
  const isPremium = isPremiumBox(input.boxType);
  const isSubscription = isSubscriptionBox(input.boxType);

  const isStep1Valid = validateOrderStep1(input);
  const isStep2Valid = validateOrderStep2(input);
  const isStep3Valid = validateOrderStep3(input);
  const isStep4Valid = isStep1Valid && isStep2Valid && isStep3Valid;

  return {
    // Box characteristics
    isPremium,
    isSubscription,

    // Auth requirements
    requiresAuth: isSubscription,
    canCheckoutAsGuest: !isSubscription,

    // Step validity
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    isComplete: isStep4Valid,

    // Address state
    hasSelectedAddress: input.selectedAddressId !== null,
    hasInlineAddress:
      Boolean(input.address.city.trim()) &&
      Boolean(input.address.postalCode.trim()) &&
      Boolean(input.address.streetAddress.trim()),
  };
}
