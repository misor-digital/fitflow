/**
 * Order Data Transformation
 *
 * Transforms between client input → API request → DB persist format.
 */

import type {
  OrderUserInput,
  OrderPersistData,
  OrderApiRequest,
  SubscriptionApiRequest,
  AddressInput,
  DeliveryMethod,
  SpeedyOfficeSelection,
} from './types';
import type { ShippingAddressSnapshot } from '@/lib/supabase/types';
import type { PriceInfo } from '@/lib/catalog';
import { sortWithOtherAtEnd } from '@/lib/catalog';

// ============================================================================
// Address Transformation
// ============================================================================

/**
 * Convert camelCase AddressInput to snake_case ShippingAddressSnapshot.
 * Trims all strings, converts empty strings to null for nullable fields.
 */
export function addressInputToSnapshot(
  address: AddressInput,
  options?: { deliveryMethod?: DeliveryMethod; speedyOffice?: SpeedyOfficeSelection | null }
): ShippingAddressSnapshot {
  const base: ShippingAddressSnapshot = {
    full_name: address.fullName.trim(),
    phone: address.phone.trim() || null,
    city: address.city.trim(),
    postal_code: address.postalCode.trim(),
    street_address: address.streetAddress.trim(),
    building_entrance: address.buildingEntrance.trim() || null,
    floor: address.floor.trim() || null,
    apartment: address.apartment.trim() || null,
    delivery_notes: address.deliveryNotes.trim() || null,
  };

  if (options?.deliveryMethod === 'speedy_office' && options.speedyOffice) {
    return {
      full_name: address.fullName.trim(),
      phone: address.phone.trim() || null,
      city: '',
      postal_code: '',
      street_address: '',
      building_entrance: null,
      floor: null,
      apartment: null,
      delivery_notes: address.deliveryNotes.trim() || null,
      delivery_method: 'speedy_office',
      speedy_office_id: options.speedyOffice.id,
      speedy_office_name: options.speedyOffice.name,
      speedy_office_address: options.speedyOffice.address,
    };
  }

  return base;
}

// ============================================================================
// Client → DB Persist Format
// ============================================================================

/**
 * Transform order user input to database persist format.
 * The canonical client → DB transformation.
 *
 * @param input - User input from the order form store
 * @param priceInfo - Server-validated price information (null if not yet calculated)
 * @param userId - Authenticated user ID (null for guest)
 * @param addressId - Saved address ID if using a stored address (null otherwise)
 * @param preorderId - Preorder ID if this order is a conversion (null otherwise)
 * @returns Data ready for Supabase insertion
 */
export function transformOrderToPersistedFormat(
  input: OrderUserInput,
  priceInfo: PriceInfo | null,
  userId: string | null,
  addressId: string | null,
  preorderId: string | null,
): OrderPersistData {
  if (!input.boxType) {
    throw new Error('Box type is required for persistence');
  }

  return {
    // Auth / Identity
    user_id: userId,
    customer_email: input.email.trim().toLowerCase(),
    customer_full_name: input.fullName.trim(),
    customer_phone: input.phone.trim() || null,

    // Address
    shipping_address: addressInputToSnapshot(input.address, {
      deliveryMethod: input.deliveryMethod,
      speedyOffice: input.speedyOffice,
    }),
    address_id: addressId,
    delivery_method: input.deliveryMethod ?? 'address',

    // Box selection
    box_type: input.boxType,

    // Personalization
    wants_personalization: input.wantsPersonalization ?? false,

    // Preferences (sorted with "other" at end for consistency)
    sports: input.sports.length > 0 ? sortWithOtherAtEnd(input.sports) : null,
    sport_other: input.sportOther.trim() || null,
    colors: input.colors.length > 0 ? input.colors : null,
    flavors: input.flavors.length > 0 ? sortWithOtherAtEnd(input.flavors) : null,
    flavor_other: input.flavorOther.trim() || null,
    dietary: input.dietary.length > 0 ? sortWithOtherAtEnd(input.dietary) : null,
    dietary_other: input.dietaryOther.trim() || null,
    size_upper: input.sizeUpper || null,
    size_lower: input.sizeLower || null,
    additional_notes: input.additionalNotes.trim() || null,

    // Pricing (from server-validated price info)
    promo_code: priceInfo?.promoCode || input.promoCode || null,
    discount_percent: priceInfo?.discountPercent ?? null,
    original_price_eur: priceInfo?.originalPriceEur ?? null,
    final_price_eur: priceInfo?.finalPriceEur ?? null,

    // Conversion
    converted_from_preorder_id: preorderId,
  };
}

// ============================================================================
// Client → API Request Format
// ============================================================================

/**
 * Transform order user input to API request format.
 * Includes address, guest flag, and conversion token.
 */
export function transformOrderToApiRequest(input: OrderUserInput): OrderApiRequest {
  if (!input.boxType) {
    throw new Error('Box type is required for submission');
  }

  const request: OrderApiRequest = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    isGuest: input.isGuest,
    boxType: input.boxType,
    wantsPersonalization: input.wantsPersonalization ?? false,
  };

  // Optional phone
  if (input.phone.trim()) {
    request.phone = input.phone.trim();
  }

  // Address
  if (input.selectedAddressId) {
    request.selectedAddressId = input.selectedAddressId;
  } else {
    request.address = input.address;
  }

  // Delivery method
  request.deliveryMethod = input.deliveryMethod ?? 'address';
  if (input.deliveryMethod === 'speedy_office' && input.speedyOffice) {
    request.speedyOffice = input.speedyOffice;
  }

  // Preferences (only if personalization is wanted)
  if (input.wantsPersonalization) {
    request.preferences = {
      sports: sortWithOtherAtEnd(input.sports),
      sportOther: input.sportOther.trim() || undefined,
      colors: input.colors.length > 0 ? input.colors : undefined,
      flavors: sortWithOtherAtEnd(input.flavors),
      flavorOther: input.flavorOther.trim() || undefined,
      dietary: sortWithOtherAtEnd(input.dietary),
      dietaryOther: input.dietaryOther.trim() || undefined,
      additionalNotes: input.additionalNotes.trim() || undefined,
    };
  }

  // Sizes (for premium boxes)
  if (input.sizeUpper || input.sizeLower) {
    request.sizes = {
      upper: input.sizeUpper || undefined,
      lower: input.sizeLower || undefined,
    };
  }

  // Promo code
  if (input.promoCode) {
    request.promoCode = input.promoCode;
  }

  // Conversion token
  if (input.conversionToken) {
    request.conversionToken = input.conversionToken;
  }

  // Delivery cycle
  if (input.deliveryCycleId) {
    request.deliveryCycleId = input.deliveryCycleId;
  }
  if (input.orderType) {
    request.orderType = input.orderType;
  }

  // Admin: on-behalf ordering
  if (input.onBehalfOfUserId) {
    request.onBehalfOfUserId = input.onBehalfOfUserId;
  }

  return request;
}

// ============================================================================
// Client → Subscription API Request Format
// ============================================================================

/**
 * Transform order user input to subscription API request format.
 * Used when the selected box type is a subscription (monthly-*).
 * Throws if required fields for subscription are missing.
 */
export function transformOrderToSubscriptionRequest(
  input: OrderUserInput,
): SubscriptionApiRequest {
  if (!input.boxType) {
    throw new Error('Box type is required for subscription');
  }

  if (!input.selectedAddressId) {
    throw new Error('A saved address is required for subscriptions');
  }

  // Derive base box type and frequency from the full box type ID.
  // 'monthly-standard'           → boxType: 'monthly-standard', frequency: 'monthly'
  // 'monthly-premium'            → boxType: 'monthly-premium',  frequency: 'monthly'
  // 'monthly-premium-monthly'    → boxType: 'monthly-premium',  frequency: 'monthly'
  // 'monthly-premium-seasonal'   → boxType: 'monthly-premium',  frequency: 'seasonal'
  let boxType: string;
  let frequency: string;

  if (input.boxType === 'monthly-standard') {
    boxType = 'monthly-standard';
    frequency = 'monthly';
  } else if (
    input.boxType === 'monthly-premium' ||
    input.boxType === 'monthly-premium-monthly'
  ) {
    boxType = 'monthly-premium';
    frequency = 'monthly';
  } else if (input.boxType === 'monthly-premium-seasonal') {
    boxType = 'monthly-premium';
    frequency = 'seasonal';
  } else {
    throw new Error(`Unsupported subscription box type: ${input.boxType}`);
  }

  const request: SubscriptionApiRequest = {
    boxType,
    frequency,
    wantsPersonalization: input.wantsPersonalization ?? false,
    addressId: input.selectedAddressId,
  };

  // Preferences (only if personalization is wanted)
  if (input.wantsPersonalization) {
    request.preferences = {
      sports: input.sports.length > 0 ? input.sports : undefined,
      sportOther: input.sportOther.trim() || undefined,
      colors: input.colors.length > 0 ? input.colors : undefined,
      flavors: input.flavors.length > 0 ? input.flavors : undefined,
      flavorOther: input.flavorOther.trim() || undefined,
      dietary: input.dietary.length > 0 ? input.dietary : undefined,
      dietaryOther: input.dietaryOther.trim() || undefined,
      additionalNotes: input.additionalNotes.trim() || undefined,
    };
  }

  // Sizes (for premium boxes)
  if (input.sizeUpper || input.sizeLower) {
    request.sizes = {
      upper: input.sizeUpper || undefined,
      lower: input.sizeLower || undefined,
    };
  }

  // Promo code
  if (input.promoCode) {
    request.promoCode = input.promoCode;
  }

  return request;
}

// ============================================================================
// Form Store Initial State
// ============================================================================

/** Empty address input for form initialization */
const INITIAL_ADDRESS_INPUT: AddressInput = {
  label: '',
  fullName: '',
  phone: '',
  city: '',
  postalCode: '',
  streetAddress: '',
  buildingEntrance: '',
  floor: '',
  apartment: '',
  deliveryNotes: '',
  isDefault: false,
};

/**
 * Initial/empty state for order user input.
 * Same box/personalization defaults as catalog, plus empty address fields.
 */
export const INITIAL_ORDER_INPUT: OrderUserInput = {
  // Step 1: Box Selection
  boxType: null,

  // Step 2: Personalization
  wantsPersonalization: null,
  sports: [],
  sportOther: '',
  colors: [],
  flavors: [],
  flavorOther: '',
  sizeUpper: '',
  sizeLower: '',
  dietary: [],
  dietaryOther: '',
  additionalNotes: '',

  // Step 3: Identity & Address
  isGuest: true,
  fullName: '',
  email: '',
  phone: '',
  selectedAddressId: null,
  address: { ...INITIAL_ADDRESS_INPUT },
  deliveryMethod: 'speedy_office' as DeliveryMethod,
  speedyOffice: null,

  // Promo
  promoCode: null,

  // Conversion
  conversionToken: null,

  // Delivery cycle
  deliveryCycleId: null,
  orderType: null,

  // Admin: on-behalf ordering
  onBehalfOfUserId: null,
};
