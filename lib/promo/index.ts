/**
 * Promo code module for FitFlow
 * URL-based promo code discounts
 */

// Types
export type { PromoCode, AppliedPromo, PriceInfo } from './types';

// Service functions
export {
  validatePromoCode,
  calculatePrice,
  getDiscountPercent,
  isValidPromoCode,
  getAllBoxPrices,
  BOX_PRICES_EUR,
  eurToBgn,
  formatPrice,
} from './promoService';
