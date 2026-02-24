/**
 * Data Transformation
 * 
 * Functions to transform data between different formats:
 * - User input (camelCase) → Persist format (snake_case)
 * - API response → Domain types
 */

import type {
  BoxTypeId,
  UserInput,
  PersistData,
  PriceInfo,
} from './types';
import { sortWithOtherAtEnd } from './derived';

// ============================================================================
// User Input → Persist Format
// ============================================================================

/**
 * Transform user input to database persist format
 * This is the single place where camelCase → snake_case conversion happens
 * 
 * @param input - User input from form store
 * @param priceInfo - Server-validated price information
 * @returns Data ready for Supabase insertion
 */
export function transformToPersistedFormat(
  input: UserInput,
  priceInfo?: PriceInfo | null
): PersistData {
  // Ensure boxType is not null for persistence
  if (!input.boxType) {
    throw new Error('Box type is required for persistence');
  }

  return {
    // Contact info
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,

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
    size_upper: input.sizeUpper || null,
    size_lower: input.sizeLower || null,
    dietary: input.dietary.length > 0 ? sortWithOtherAtEnd(input.dietary) : null,
    dietary_other: input.dietaryOther.trim() || null,
    additional_notes: input.additionalNotes.trim() || null,

    // Pricing (from server-validated price info)
    promo_code: priceInfo?.promoCode || input.promoCode || null,
    discount_percent: priceInfo?.discountPercent ?? null,
    original_price_eur: priceInfo?.originalPriceEur ?? null,
    final_price_eur: priceInfo?.finalPriceEur ?? null,
  };
}

// ============================================================================
// API Request Format
// ============================================================================

/**
 * Format for sending to /api/order
 * This matches what the API route expects
 */
export interface ApiRequest {
  fullName: string;
  email: string;
  phone?: string;
  boxType: BoxTypeId;
  wantsPersonalization: boolean;
  preferences?: {
    sports?: string[];
    sportOther?: string;
    colors?: string[];
    flavors?: string[];
    flavorOther?: string;
    dietary?: string[];
    dietaryOther?: string;
    additionalNotes?: string;
  };
  sizes?: {
    upper?: string;
    lower?: string;
  };
  promoCode?: string | null;
}

/**
 * Transform user input to API request format
 * 
 * @param input - User input from form store
 * @returns Data formatted for API submission
 */
export function transformToApiRequest(input: UserInput): ApiRequest {
  if (!input.boxType) {
    throw new Error('Box type is required for submission');
  }

  const request: ApiRequest = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    boxType: input.boxType,
    wantsPersonalization: input.wantsPersonalization ?? false,
  };

  // Optional phone
  if (input.phone.trim()) {
    request.phone = input.phone.trim();
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

  return request;
}

// ============================================================================
// Form Store Initial State
// ============================================================================

/**
 * Initial/empty state for user input
 * Use this when resetting the form
 */
export const INITIAL_USER_INPUT: UserInput = {
  boxType: null,
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
  fullName: '',
  email: '',
  phone: '',
  promoCode: null,
};

// ============================================================================
// Utility: Extract user input from form store
// ============================================================================

/**
 * Extract UserInput from a form store state
 * Useful when the store has additional methods/properties
 */
export function extractUserInput(store: Record<string, unknown>): UserInput {
  return {
    boxType: (store.boxType as BoxTypeId | null) ?? null,
    wantsPersonalization: (store.wantsPersonalization as boolean | null) ?? null,
    sports: (store.sports as string[]) ?? [],
    sportOther: (store.sportOther as string) ?? '',
    colors: (store.colors as string[]) ?? [],
    flavors: (store.flavors as string[]) ?? [],
    flavorOther: (store.flavorOther as string) ?? '',
    sizeUpper: (store.sizeUpper as string) ?? '',
    sizeLower: (store.sizeLower as string) ?? '',
    dietary: (store.dietary as string[]) ?? [],
    dietaryOther: (store.dietaryOther as string) ?? '',
    additionalNotes: (store.additionalNotes as string) ?? '',
    fullName: (store.fullName as string) ?? '',
    email: (store.email as string) ?? '',
    phone: (store.phone as string) ?? '',
    promoCode: (store.promoCode as string | null) ?? null,
  };
}
