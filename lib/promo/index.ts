/**
 * Promo code module for FitFlow
 */

// Types
export type { 
  DiscountType, 
  PromoCode, 
  AppliedDiscount, 
  PromoValidationResult 
} from './types';

// Service functions
export {
  validatePromoCode,
  getBoxPrice,
  calculateFinalPrice,
  formatDiscount,
  BOX_PRICES,
} from './promoService';
