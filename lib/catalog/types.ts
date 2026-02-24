/**
 * Catalog Domain Types
 *
 * Single source of truth for box-type, pricing, personalization, and validation types.
 * Used by both the order flow and legacy preorder conversion.
 *
 * NOTE: BoxTypeId is re-exported from lib/supabase/types.ts where it's defined
 * as BoxType to match the database enum. We alias it here for semantic clarity
 * (BoxTypeId = identifier, BoxType = full entity).
 */

// ============================================================================
// Box Types
// ============================================================================

// Import the canonical BoxType from Supabase types (matches DB enum)
// and re-export as BoxTypeId for semantic clarity in the catalog domain
import type { BoxType as SupabaseBoxType } from '@/lib/supabase/types';

/**
 * All valid box type identifiers
 * Alias for the Supabase BoxType enum for semantic clarity.
 */
export type BoxTypeId = SupabaseBoxType;

/**
 * Box type configuration from database
 */
export interface BoxType {
  id: BoxTypeId;
  name: string;
  description: string | null;
  priceEur: number;
  isSubscription: boolean;
  isPremium: boolean;
  frequency: 'monthly' | 'seasonal' | null;
  sortOrder: number;
}

/**
 * Premium frequency options for monthly-premium box
 */
export type PremiumFrequency = 'monthly' | 'seasonal';

// ============================================================================
// Price Information (Derived - Server Calculated)
// ============================================================================

/**
 * Complete price information for a box type
 * This is the canonical PriceInfo type - use this everywhere
 */
export interface PriceInfo {
  boxTypeId: string;
  boxTypeName: string;
  originalPriceEur: number;
  originalPriceBgn: number;
  discountPercent: number;
  discountAmountEur: number;
  discountAmountBgn: number;
  finalPriceEur: number;
  finalPriceBgn: number;
  promoCode: string | null;
}

/**
 * Simplified price info for display components
 * Used by PriceDisplay component
 */
export interface PriceDisplayInfo {
  originalPriceEur: number;
  originalPriceBgn: number;
  finalPriceEur: number;
  finalPriceBgn: number;
  discountPercent: number;
  discountAmountEur: number;
  discountAmountBgn: number;
}

// ============================================================================
// User Input (Raw Form Data)
// ============================================================================

/**
 * Raw user input collected across all steps
 * This is what gets stored in the client-side form store
 */
export interface UserInput {
  // Step 1: Box Selection
  boxType: BoxTypeId | null;
  
  // Step 2: Personalization
  wantsPersonalization: boolean | null;
  sports: string[];
  sportOther: string;
  colors: string[];  // hex values
  flavors: string[];
  flavorOther: string;
  sizeUpper: string;
  sizeLower: string;
  dietary: string[];
  dietaryOther: string;
  additionalNotes: string;
  
  // Step 3: Contact Info
  fullName: string;
  email: string;
  phone: string;
  
  // Promo (from URL)
  promoCode: string | null;
}

// ============================================================================
// Derived State (Computed from UserInput)
// ============================================================================

/**
 * Personalization sub-steps
 */
export type PersonalizationStep = 
  | 'personalization' 
  | 'sport' 
  | 'colors' 
  | 'flavors' 
  | 'size' 
  | 'dietary' 
  | 'notes';

/**
 * Derived state computed from user input
 * These values should never be stored - always computed
 */
export interface DerivedState {
  // Box characteristics
  isPremium: boolean;
  isSubscription: boolean;
  
  // Personalization requirements
  requiresSizes: boolean;
  requiresColors: boolean;
  
  // Validation state
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  isComplete: boolean;
  
  // Active personalization steps based on box type and personalization choice
  activePersonalizationSteps: PersonalizationStep[];
  
  // Current step progress (for step 2)
  personalizationProgress: number;
}

// ============================================================================
// Persisted Data (What goes to Supabase)
// ============================================================================

/**
 * Data format for Supabase insertion
 * Uses snake_case to match database column names
 */
export interface PersistData {
  // Contact
  full_name: string;
  email: string;
  phone: string | null;
  
  // Box
  box_type: BoxTypeId;
  
  // Personalization
  wants_personalization: boolean;
  sports: string[] | null;
  sport_other: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavor_other: string | null;
  size_upper: string | null;
  size_lower: string | null;
  dietary: string[] | null;
  dietary_other: string | null;
  additional_notes: string | null;
  
  // Pricing (server-validated)
  promo_code: string | null;
  discount_percent: number | null;
  original_price_eur: number | null;
  final_price_eur: number | null;
}

// ============================================================================
// Catalog Options (for UI)
// ============================================================================

/**
 * Generic option item for dropdowns/selections
 */
export interface CatalogOption {
  id: string;
  label: string;
  value?: string | null;
}

/**
 * Color option with hex value
 */
export interface ColorOption extends CatalogOption {
  hex: string;
}

/**
 * Complete catalog data for the order flow
 */
export interface CatalogData {
  boxTypes: BoxType[];
  options: {
    sports: CatalogOption[];
    colors: ColorOption[];
    flavors: CatalogOption[];
    dietary: CatalogOption[];
    sizes: CatalogOption[];
  };
  labels: {
    boxTypes: Record<string, string>;
    sports: Record<string, string>;
    colors: Record<string, string>;
    flavors: Record<string, string>;
    dietary: Record<string, string>;
    sizes: Record<string, string>;
  };
}

/**
 * Prices map keyed by box type ID
 */
export type PricesMap = Record<string, PriceInfo>;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
  code: 'required' | 'invalid_format' | 'invalid_value' | 'too_short' | 'too_long';
}

/**
 * Result of validating user input
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from /api/catalog?type=prices
 */
export interface PricesApiResponse {
  prices: PricesMap;
}

/**
 * Response from /api/catalog?type=all
 */
export interface CatalogApiResponse extends CatalogData {
  boxTypeNames: Record<string, string>;
}

/**
 * Response from /api/promo/validate
 */
export interface PromoValidationResponse {
  valid: boolean;
  code?: string;
  discountPercent?: number;
  error?: string;
}

/**
 * Response from /api/order POST
 */
export interface SubmitResponse {
  success: boolean;
  message?: string;
  preorderId?: string;
  error?: string;
}
