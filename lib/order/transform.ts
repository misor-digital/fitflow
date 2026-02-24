/**
 * Order Data Transformation
 *
 * Transforms between client input → API request → DB persist format.
 */

import type {
  OrderUserInput,
  OrderPersistData,
  OrderApiRequest,
  AddressInput,
} from './types';
import type { ShippingAddressSnapshot } from '@/lib/supabase/types';
import type { PriceInfo } from '@/lib/preorder';
import { sortWithOtherAtEnd } from '@/lib/preorder';

// ============================================================================
// Address Transformation
// ============================================================================

/**
 * Convert camelCase AddressInput to snake_case ShippingAddressSnapshot.
 * Trims all strings, converts empty strings to null for nullable fields.
 */
export function addressInputToSnapshot(address: AddressInput): ShippingAddressSnapshot {
  return {
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
    shipping_address: addressInputToSnapshot(input.address),
    address_id: addressId,

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
 * Same box/personalization defaults as preorder, plus empty address fields.
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

  // Promo
  promoCode: null,

  // Conversion
  conversionToken: null,
};
