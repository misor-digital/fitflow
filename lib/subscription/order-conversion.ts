/**
 * Order-to-Subscription Conversion Logic
 *
 * Handles box type mapping, building a subscription insert from order data,
 * and validating that an order is eligible for conversion.
 */

import type { OrderRow, SubscriptionInsert } from '@/lib/supabase/types';

// ============================================================================
// Box Type Mapping
// ============================================================================

const BOX_TYPE_MAP: Record<string, string> = {
  'onetime-standard': 'monthly-standard',
  'onetime-premium': 'monthly-premium',
};

/**
 * Map a one-time order box type to its subscription equivalent.
 * Works for both direct and one-time order types since they share box type naming.
 */
export function mapOrderBoxToSubscriptionBox(orderBoxType: string): string {
  const mapped = BOX_TYPE_MAP[orderBoxType];
  if (!mapped) {
    throw new Error(`Невалиден тип кутия за конвертиране: ${orderBoxType}`);
  }
  return mapped;
}

// ============================================================================
// Build Subscription From Order
// ============================================================================

interface ConversionOverrides {
  frequency?: string;
  wantsPersonalization?: boolean;
  sports?: string[] | null;
  colors?: string[] | null;
  flavors?: string[] | null;
  dietary?: string[] | null;
  sizeUpper?: string | null;
  sizeLower?: string | null;
  promoCode?: string | null;
}

/**
 * Extract subscription-relevant fields from an order, with optional overrides.
 *
 * Note: `frequency`, `default_address_id`, and pricing fields are NOT included —
 * they come from user input and server-side calculation.
 */
export function buildSubscriptionFromOrder(
  order: OrderRow,
  overrides?: ConversionOverrides,
): Partial<SubscriptionInsert> {
  return {
    box_type: mapOrderBoxToSubscriptionBox(order.box_type),
    wants_personalization:
      overrides?.wantsPersonalization ?? order.wants_personalization,
    sports: overrides?.sports ?? order.sports,
    colors: overrides?.colors ?? order.colors,
    flavors: overrides?.flavors ?? order.flavors,
    dietary: overrides?.dietary ?? order.dietary,
    size_upper: overrides?.sizeUpper ?? order.size_upper,
    size_lower: overrides?.sizeLower ?? order.size_lower,
  };
}

// ============================================================================
// Order Eligibility Check
// ============================================================================

interface ConversionEligibility {
  valid: boolean;
  reason?: string;
}

/**
 * Check whether an order is eligible for conversion to a subscription.
 *
 * Conditions:
 * 1. Order must be delivered
 * 2. Not already converted
 * 3. Not linked to a subscription
 * 4. Box type must be mappable
 *
 * Does NOT check `user_id` — guest orders are valid conversion candidates.
 */
export function validateOrderForConversion(
  order: OrderRow,
): ConversionEligibility {
  if (order.status !== 'delivered') {
    return { valid: false, reason: 'Поръчката трябва да е доставена.' };
  }

  if (order.subscription_conversion_status === 'converted') {
    return { valid: false, reason: 'Поръчката вече е конвертирана.' };
  }

  if (order.converted_to_subscription_id !== null) {
    return { valid: false, reason: 'Поръчката вече е свързана с абонамент.' };
  }

  try {
    mapOrderBoxToSubscriptionBox(order.box_type);
  } catch {
    return {
      valid: false,
      reason: `Типът кутия "${order.box_type}" не може да бъде конвертиран.`,
    };
  }

  return { valid: true };
}
