/**
 * Promo code module for FitFlow
 * 
 * DEPRECATED: This module is kept for backwards compatibility.
 * All promo code logic has been moved to lib/data/promo.ts
 * and pricing logic to lib/data/catalog.ts
 * 
 * Use imports from '@/lib/data' instead.
 */

// Types
export type { PromoCode, AppliedPromo, PriceInfo } from './types';

// Service functions (deprecated - delegate to lib/data)
export {
  validatePromoCode,
  calculatePrice,
  getDiscountPercent,
  getAllBoxPrices,
  BOX_PRICES_EUR,
  eurToBgn,
} from './promoService';

// Re-export isValidPromoCode from lib/data
export { isValidPromoCode } from '@/lib/data/promo';

// Re-export formatPrice locally to avoid breaking imports
export function formatPrice(price: number): string {
  return price.toFixed(2);
}
