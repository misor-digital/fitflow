/**
 * Promo code service
 * Server-side validation and price calculation for promo codes
 */

import type { PromoCode, AppliedPromo, PriceInfo } from './types';

// EUR to BGN conversion rate (fixed rate)
const EUR_TO_BGN_RATE = 1.9558;

/**
 * Valid promo codes configuration
 * In production, this could be stored in a database
 */
const PROMO_CODES: Record<string, PromoCode> = {
  'FITFLOW10': {
    code: 'FITFLOW10',
    discountPercent: 10,
    isActive: true,
  },
  'FITFLOW25': {
    code: 'FITFLOW25',
    discountPercent: 25,
    isActive: true,
  },
};

/**
 * Base prices in EUR for each box type
 */
export const BOX_PRICES_EUR: Record<string, number> = {
  'monthly-standard': 24.90,
  'monthly-premium': 34.90,
  'monthly-premium-monthly': 34.90,
  'monthly-premium-seasonal': 34.90,
  'onetime-standard': 29.90,
  'onetime-premium': 39.90,
};

/**
 * Convert EUR to BGN
 */
export function eurToBgn(eur: number): number {
  return Math.round(eur * EUR_TO_BGN_RATE * 100) / 100;
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
export function validatePromoCode(code: string | null | undefined): AppliedPromo | null {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  const promo = PROMO_CODES[normalizedCode];

  if (!promo || !promo.isActive) {
    return null;
  }

  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
  };
}

/**
 * Calculate price with optional promo code discount
 * All calculations are based on EUR price as the source of truth
 */
export function calculatePrice(
  boxType: string,
  promoCode: string | null | undefined
): PriceInfo {
  const originalPriceEur = BOX_PRICES_EUR[boxType] || 0;
  const originalPriceBgn = eurToBgn(originalPriceEur);

  const appliedPromo = validatePromoCode(promoCode);

  if (!appliedPromo) {
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

  const discountPercent = appliedPromo.discountPercent;
  const discountAmountEur = Math.round(originalPriceEur * (discountPercent / 100) * 100) / 100;
  const discountAmountBgn = eurToBgn(discountAmountEur);
  const finalPriceEur = Math.round((originalPriceEur - discountAmountEur) * 100) / 100;
  const finalPriceBgn = eurToBgn(finalPriceEur);

  return {
    originalPriceEur,
    originalPriceBgn,
    discountPercent,
    discountAmountEur,
    discountAmountBgn,
    finalPriceEur,
    finalPriceBgn,
    promoCode: appliedPromo.code,
  };
}

/**
 * Get discount percentage for a promo code (for display purposes)
 * Returns 0 if code is invalid
 */
export function getDiscountPercent(promoCode: string | null | undefined): number {
  const appliedPromo = validatePromoCode(promoCode);
  return appliedPromo?.discountPercent || 0;
}

/**
 * Check if a promo code is valid (for quick validation)
 */
export function isValidPromoCode(code: string | null | undefined): boolean {
  return validatePromoCode(code) !== null;
}

/**
 * Get all box prices with optional promo code applied
 * Useful for displaying all prices on step-1
 */
export function getAllBoxPrices(promoCode: string | null | undefined): Record<string, PriceInfo> {
  const result: Record<string, PriceInfo> = {};
  
  for (const boxType of Object.keys(BOX_PRICES_EUR)) {
    result[boxType] = calculatePrice(boxType, promoCode);
  }
  
  return result;
}
