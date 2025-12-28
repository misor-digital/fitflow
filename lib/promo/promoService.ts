/**
 * Promo code service
 * Server-side validation and price calculation for promo codes
 * 
 * NOTE: This service now uses database-backed catalog data.
 * For new code, prefer using lib/data/catalog.ts directly.
 */

import type { AppliedPromo, PriceInfo } from './types';
import { 
  validatePromoCode as dbValidatePromoCode,
  getPromoDiscountPercent,
  getBoxTypeById,
  getBoxPricesMap,
  getEurToBgnRate,
  calculatePrice as dbCalculatePrice
} from '@/lib/data/catalog';

// Fallback EUR to BGN conversion rate (used if DB unavailable)
const EUR_TO_BGN_RATE_FALLBACK = 1.9558;

// Fallback prices (used if DB unavailable)
const FALLBACK_BOX_PRICES_EUR: Record<string, number> = {
  'monthly-standard': 24.90,
  'monthly-premium': 34.90,
  'monthly-premium-monthly': 34.90,
  'monthly-premium-seasonal': 34.90,
  'one-time-standard': 29.90,
  'one-time-premium': 39.90,
  'onetime-standard': 29.90,
  'onetime-premium': 39.90,
};

/**
 * Get box prices - tries DB first, falls back to hardcoded
 */
export async function getBoxPricesEur(): Promise<Record<string, number>> {
  try {
    return await getBoxPricesMap();
  } catch (error) {
    console.warn('Failed to fetch box prices from DB, using fallback:', error);
    return FALLBACK_BOX_PRICES_EUR;
  }
}

/**
 * Convert EUR to BGN
 */
export async function eurToBgn(eur: number): Promise<number> {
  try {
    const rate = await getEurToBgnRate();
    return Math.round(eur * rate * 100) / 100;
  } catch {
    return Math.round(eur * EUR_TO_BGN_RATE_FALLBACK * 100) / 100;
  }
}

/**
 * Synchronous EUR to BGN conversion (uses fallback rate)
 */
export function eurToBgnSync(eur: number): number {
  return Math.round(eur * EUR_TO_BGN_RATE_FALLBACK * 100) / 100;
}

/**
 * Format price with 2 decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Validate a promo code (case-insensitive)
 * Returns the promo code data if valid, null otherwise
 */
export async function validatePromoCode(code: string | null | undefined): Promise<AppliedPromo | null> {
  if (!code || typeof code !== 'string') {
    return null;
  }

  try {
    const promo = await dbValidatePromoCode(code);
    if (!promo) return null;

    return {
      code: promo.code,
      discountPercent: promo.discount_percent,
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return null;
  }
}

/**
 * Calculate price with optional promo code discount - ASYNC version (server-side)
 * All calculations are based on EUR price as the source of truth
 */
<<<<<<< Updated upstream
export async function calculatePrice(
  boxType: string,
  promoCode: string | null | undefined
): Promise<PriceInfo> {
  try {
    const result = await dbCalculatePrice(boxType, promoCode);
    return {
      originalPriceEur: result.originalPriceEur,
      originalPriceBgn: result.originalPriceBgn,
      discountPercent: result.discountPercent,
      discountAmountEur: result.discountAmountEur,
      discountAmountBgn: result.discountAmountBgn,
      finalPriceEur: result.finalPriceEur,
      finalPriceBgn: result.finalPriceBgn,
      promoCode: result.promoCode,
    };
  } catch (error) {
    console.error('Error calculating price from DB:', error);
    // Fallback to hardcoded prices
    const originalPriceEur = FALLBACK_BOX_PRICES_EUR[boxType] || 0;
    const originalPriceBgn = eurToBgnSync(originalPriceEur);
    
=======
export async function calculatePriceAsync(
  boxType: string,
  promoCode: string | null | undefined
): Promise<PriceInfo> {
  try {
    const result = await dbCalculatePrice(boxType, promoCode);
    return {
      originalPriceEur: result.originalPriceEur,
      originalPriceBgn: result.originalPriceBgn,
      discountPercent: result.discountPercent,
      discountAmountEur: result.discountAmountEur,
      discountAmountBgn: result.discountAmountBgn,
      finalPriceEur: result.finalPriceEur,
      finalPriceBgn: result.finalPriceBgn,
      promoCode: result.promoCode,
    };
  } catch (error) {
    console.error('Error calculating price from DB:', error);
    // Fallback to sync calculation
    return calculatePrice(boxType, promoCode);
  }
}

/**
 * Calculate price with optional promo code discount - SYNC version (client-side)
 * Uses hardcoded prices and known promo codes for client-side display
 * Actual validation happens server-side on form submission
 */
export function calculatePrice(
  boxType: string,
  promoCode: string | null | undefined
): PriceInfo {
  const originalPriceEur = FALLBACK_BOX_PRICES_EUR[boxType] || 0;
  const originalPriceBgn = eurToBgnSync(originalPriceEur);
  
  // Get discount from known promo codes
  const discountPercent = getDiscountPercent(promoCode);
  
  if (discountPercent === 0) {
>>>>>>> Stashed changes
    return {
      originalPriceEur,
      originalPriceBgn,
      discountPercent: 0,
      discountAmountEur: 0,
      discountAmountBgn: 0,
      finalPriceEur: originalPriceEur,
      finalPriceBgn: originalPriceBgn,
      promoCode: null,
    };
  }
<<<<<<< Updated upstream
}

/**
 * Get discount percentage for a promo code (for display purposes)
 * Returns 0 if code is invalid
 */
export async function getDiscountPercent(promoCode: string | null | undefined): Promise<number> {
  return getPromoDiscountPercent(promoCode);
}

/**
 * Check if a promo code is valid (for quick validation)
 */
export async function isValidPromoCode(code: string | null | undefined): Promise<boolean> {
  const appliedPromo = await validatePromoCode(code);
  return appliedPromo !== null;
}

/**
 * Get all box prices with optional promo code applied
 * Useful for displaying all prices on step-1
 */
export async function getAllBoxPrices(promoCode: string | null | undefined): Promise<Record<string, PriceInfo>> {
  const result: Record<string, PriceInfo> = {};
  const boxPrices = await getBoxPricesEur();
  
  for (const boxType of Object.keys(boxPrices)) {
    result[boxType] = await calculatePrice(boxType, promoCode);
  }
  
  return result;
}

// ============================================================================
// SYNCHRONOUS VERSIONS (for client-side use without DB access)
// ============================================================================

/**
 * Synchronous price calculation for client-side use
 * Uses hardcoded prices and discountPercent from store
 */
export function calculatePriceSync(
  boxType: string,
  discountPercent: number = 0
): PriceInfo {
  const originalPriceEur = FALLBACK_BOX_PRICES_EUR[boxType] || 0;
  const originalPriceBgn = eurToBgnSync(originalPriceEur);
  
  if (discountPercent === 0) {
    return {
      originalPriceEur,
      originalPriceBgn,
      discountPercent: 0,
      discountAmountEur: 0,
      discountAmountBgn: 0,
      finalPriceEur: originalPriceEur,
      finalPriceBgn: originalPriceBgn,
      promoCode: null,
    };
  }
=======
>>>>>>> Stashed changes
  
  const discountAmountEur = Math.round(originalPriceEur * (discountPercent / 100) * 100) / 100;
  const discountAmountBgn = eurToBgnSync(discountAmountEur);
  const finalPriceEur = Math.round((originalPriceEur - discountAmountEur) * 100) / 100;
  const finalPriceBgn = eurToBgnSync(finalPriceEur);
  
  return {
    originalPriceEur,
    originalPriceBgn,
    discountPercent,
    discountAmountEur,
    discountAmountBgn,
    finalPriceEur,
    finalPriceBgn,
<<<<<<< Updated upstream
    promoCode: null,
=======
    promoCode: promoCode?.trim().toUpperCase() || null,
>>>>>>> Stashed changes
  };
}

/**
<<<<<<< Updated upstream
 * @deprecated Use async validatePromoCode instead
 */
=======
 * Get discount percentage for a promo code (for display purposes) - ASYNC version
 * Returns 0 if code is invalid
 */
export async function getDiscountPercentAsync(promoCode: string | null | undefined): Promise<number> {
  return getPromoDiscountPercent(promoCode);
}

/**
 * Get discount percentage for a promo code (for display purposes) - SYNC version
 * For client-side use only - validates against known promo codes
 * Returns 0 if code is invalid or unknown
 */
export function getDiscountPercent(promoCode: string | null | undefined): number {
  // Client-side fallback - return 0 since we can't validate without DB
  // The actual discount will be validated server-side on form submission
  if (!promoCode || typeof promoCode !== 'string') {
    return 0;
  }
  
  // Known promo codes for client-side display only
  // These are just for UI hints - actual validation happens server-side
  const KNOWN_PROMOS: Record<string, number> = {
    'FITFLOW10': 10,
    'FITFLOW20': 20,
    'FITFLOW25': 25,
    'FITFLOW30': 30,
  };
  
  const normalizedCode = promoCode.trim().toUpperCase();
  return KNOWN_PROMOS[normalizedCode] || 0;
}

/**
 * Check if a promo code is valid (for quick validation) - ASYNC version
 */
export async function isValidPromoCodeAsync(code: string | null | undefined): Promise<boolean> {
  const appliedPromo = await validatePromoCode(code);
  return appliedPromo !== null;
}

/**
 * Check if a promo code is valid (for quick validation) - SYNC version
 * For client-side use only - validates against known promo codes
 */
export function isValidPromoCode(code: string | null | undefined): boolean {
  return getDiscountPercent(code) > 0;
}

/**
 * Get all box prices with optional promo code applied
 * Useful for displaying all prices on step-1
 */
export async function getAllBoxPrices(promoCode: string | null | undefined): Promise<Record<string, PriceInfo>> {
  const result: Record<string, PriceInfo> = {};
  const boxPrices = await getBoxPricesEur();
  
  for (const boxType of Object.keys(boxPrices)) {
    result[boxType] = await calculatePrice(boxType, promoCode);
  }
  
  return result;
}

// ============================================================================
// LEGACY SYNCHRONOUS EXPORTS (for backward compatibility during migration)
// These should be replaced with async versions in call sites
// ============================================================================

/**
 * @deprecated Use async validatePromoCode instead
 */
>>>>>>> Stashed changes
export const BOX_PRICES_EUR = FALLBACK_BOX_PRICES_EUR;
