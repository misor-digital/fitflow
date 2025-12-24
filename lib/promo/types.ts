/**
 * Promo code types and data model
 * Clean, simple data model for URL-based promo codes
 */

export interface PromoCode {
  code: string;
  discountPercent: number;
  isActive: boolean;
}

export interface AppliedPromo {
  code: string;
  discountPercent: number;
}

export interface PriceInfo {
  originalPriceEur: number;
  originalPriceBgn: number;
  discountPercent: number;
  discountAmountEur: number;
  discountAmountBgn: number;
  finalPriceEur: number;
  finalPriceBgn: number;
  promoCode: string | null;
}
