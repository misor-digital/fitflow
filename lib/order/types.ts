/**
 * Canonical Order Domain Types
 *
 * Single source of truth for all order-related types.
 * Box/personalization types are imported from @/lib/preorder.
 */

import type { BoxTypeId, PriceInfo, PriceDisplayInfo, PricesMap } from '@/lib/preorder';
import type { OrderStatus, ShippingAddressSnapshot } from '@/lib/supabase/types';

// Re-export for convenience
export type { OrderStatus, ShippingAddressSnapshot };
export type { BoxTypeId, PriceInfo, PriceDisplayInfo, PricesMap };

// ============================================================================
// Address Input
// ============================================================================

/** Raw address input from the form */
export interface AddressInput {
  label: string;
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  buildingEntrance: string;
  floor: string;
  apartment: string;
  deliveryNotes: string;
  isDefault: boolean;
}

// ============================================================================
// Order User Input
// ============================================================================

/**
 * Complete user input collected across all order steps.
 * Extends concept of PreorderUserInput with address + auth awareness.
 */
export interface OrderUserInput {
  // Step 1: Box Selection (same as preorder)
  boxType: BoxTypeId | null;

  // Step 2: Personalization (same as preorder)
  wantsPersonalization: boolean | null;
  sports: string[];
  sportOther: string;
  colors: string[];
  flavors: string[];
  flavorOther: string;
  sizeUpper: string;
  sizeLower: string;
  dietary: string[];
  dietaryOther: string;
  additionalNotes: string;

  // Step 3: Identity & Address
  isGuest: boolean;
  fullName: string;
  email: string;
  phone: string;
  selectedAddressId: string | null;  // for authenticated users with saved addresses
  address: AddressInput;             // inline address (new or guest)

  // Promo
  promoCode: string | null;

  // Conversion (null for fresh orders)
  conversionToken: string | null;
}

// ============================================================================
// Derived State
// ============================================================================

/** Order step identifiers */
export type OrderStep = 1 | 2 | 3 | 4;

export interface OrderDerivedState {
  // Box characteristics (delegated to preorder helpers)
  isPremium: boolean;
  isSubscription: boolean;

  // Auth requirements
  requiresAuth: boolean;      // true for subscription boxes
  canCheckoutAsGuest: boolean; // true for one-time boxes only

  // Step validity
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  isStep4Valid: boolean; // all prior steps valid = can confirm
  isComplete: boolean;

  // Address state
  hasSelectedAddress: boolean;
  hasInlineAddress: boolean;
}

// ============================================================================
// Persist Data (snake_case for Supabase)
// ============================================================================

export interface OrderPersistData {
  user_id: string | null;
  customer_email: string;
  customer_full_name: string;
  customer_phone: string | null;
  shipping_address: ShippingAddressSnapshot;
  address_id: string | null;
  box_type: string;
  wants_personalization: boolean;
  sports: string[] | null;
  sport_other: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavor_other: string | null;
  dietary: string[] | null;
  dietary_other: string | null;
  size_upper: string | null;
  size_lower: string | null;
  additional_notes: string | null;
  promo_code: string | null;
  discount_percent: number | null;
  original_price_eur: number | null;
  final_price_eur: number | null;
  converted_from_preorder_id: string | null;
}

// ============================================================================
// API Types
// ============================================================================

export interface OrderApiRequest {
  // Identity
  fullName: string;
  email: string;
  phone?: string;
  isGuest: boolean;

  // Address
  selectedAddressId?: string | null;
  address?: AddressInput;

  // Box
  boxType: BoxTypeId;
  wantsPersonalization: boolean;

  // Personalization
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

  // Promo
  promoCode?: string | null;

  // Conversion
  conversionToken?: string | null;
}

export interface OrderSubmitResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  message?: string;
  error?: string;
}

// ============================================================================
// Order Tracking
// ============================================================================

export interface OrderTrackingData {
  orderNumber: string;
  status: OrderStatus;
  customerFullName: string;
  boxType: string;
  boxTypeName: string;
  shippingAddress: ShippingAddressSnapshot;
  finalPriceEur: number | null;
  createdAt: string;
  statusHistory: Array<{
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    notes: string | null;
    createdAt: string;
  }>;
}
