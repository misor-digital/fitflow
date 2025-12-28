/**
 * Promo code service - DEPRECATED
 * 
 * This file is kept for backwards compatibility.
 * All promo code logic has been moved to lib/data/promo.ts
 * and pricing logic to lib/data/catalog.ts
 * 
 * These functions now delegate to the new DB-backed implementations.
 */

import { 
  validatePromoCode as dbValidatePromoCode,
  getDiscountPercent as dbGetDiscountPercent,
  incrementPromoCodeUsage as dbIncrementPromoCodeUsage,
} from '@/lib/data/promo';
import {
  calculatePrice as dbCalculatePrice,
  getBoxPricesEur,
  getEurToBgnRate,
  type PriceInfo,
} from '@/lib/data/catalog';

// Re-export types
export type { PriceInfo };

/**
 * @deprecated Use validatePromoCode from '@/lib/data' instead
 */
export async function validatePromoCode(code: string | null | undefined) {
  return dbValidatePromoCode(code);
}

/**
 * @deprecated Use getDiscountPercent from '@/lib/data' instead
 */
export async function getDiscountPercent(code: string | null | undefined): Promise<number> {
  return dbGetDiscountPercent(code);
}

/**
 * @deprecated Use incrementPromoCodeUsage from '@/lib/data' instead
 */
export async function incrementPromoCodeUsage(code: string): Promise<void> {
  return dbIncrementPromoCodeUsage(code);
}

/**
 * @deprecated Use calculatePrice from '@/lib/data' instead
 */
export async function calculatePrice(
  boxType: string,
  promoCode?: string | null
): Promise<PriceInfo> {
  return dbCalculatePrice(boxType, promoCode);
}

/**
 * @deprecated Use getBoxPricesEur from '@/lib/data' instead
 */
export async function getAllBoxPrices(promoCode?: string | null) {
  const boxPrices = await getBoxPricesEur();
  const eurToBgnRate = await getEurToBgnRate();
  const discountPercent = promoCode ? await dbGetDiscountPercent(promoCode) : 0;
  
  const result: Record<string, PriceInfo> = {};
  
  for (const boxType of Object.keys(boxPrices)) {
    result[boxType] = await dbCalculatePrice(boxType, promoCode);
  }
  
  return result;
}

/**
 * @deprecated Use eurToBgn from '@/lib/data' instead
 */
export async function eurToBgn(eur: number): Promise<number> {
  const rate = await getEurToBgnRate();
  return Math.round(eur * rate * 100) / 100;
}

// Legacy exports for backwards compatibility
export const BOX_PRICES_EUR = {
  'monthly-standard': 24.90,
  'monthly-premium': 34.90,
  'monthly-premium-monthly': 34.90,
  'monthly-premium-seasonal': 34.90,
  'onetime-standard': 29.90,
  'onetime-premium': 39.90,
};
