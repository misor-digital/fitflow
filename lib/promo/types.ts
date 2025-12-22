/**
 * Promo code types for FitFlow
 */

export type DiscountType = 'percentage' | 'fixed';

export interface PromoCode {
  code: string;
  discountType: DiscountType;
  discountValue: number; // Percentage (0-100) or fixed amount in BGN
  description: string;
  minOrderValue?: number; // Minimum order value in BGN
  maxUses?: number; // Maximum number of uses (null = unlimited)
  currentUses: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
}

export interface AppliedDiscount {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number; // Calculated discount amount in BGN
  description: string;
}

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  discount?: AppliedDiscount;
}
