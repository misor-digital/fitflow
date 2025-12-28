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
 * Calculate price with optional promo code discount
 * All calculations are based on EUR price as the source of truth
 */
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
// LEGACY SYNCHRONOUS EXPORTS (for backward compatibility during migration)
// These should be replaced with async versions in call sites
// ============================================================================

/**
 * @deprecated Use async validatePromoCode instead
 */
export const BOX_PRICES_EUR = FALLBACK_BOX_PRICES_EUR;
