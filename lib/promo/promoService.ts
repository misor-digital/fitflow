/**
 * Promo code service for FitFlow
 * Handles promo code validation and discount calculation
 */

import type { PromoCode, PromoValidationResult, AppliedDiscount } from './types';

// Box prices in BGN (extracted from step-4 page)
export const BOX_PRICES: Record<string, number> = {
  'monthly-standard': 48.70,
  'monthly-premium-monthly': 68.26,
  'monthly-premium-seasonal': 68.26,
  'onetime-standard': 58.48,
  'onetime-premium': 78.04,
};

// TODO: Static promo codes configuration
// TODO: In production, these would be stored in a database
const PROMO_CODES: PromoCode[] = [
  {
    code: 'FITFLOW10',
    discountType: 'percentage',
    discountValue: 10,
    description: '10% отстъпка',
    isActive: true,
    currentUses: 0,
  },
  {
    code: 'FITFLOW25',
    discountType: 'percentage',
    discountValue: 25,
    description: '25% отстъпка',
    isActive: true,
    currentUses: 0,
  },
];

/**
 * Find a promo code by its code string (case-insensitive)
 */
function findPromoCode(code: string): PromoCode | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return PROMO_CODES.find(p => p.code.toUpperCase() === normalizedCode);
}

/**
 * Calculate the discount amount based on the promo code and order value
 */
function calculateDiscountAmount(
  promo: PromoCode,
  orderValue: number
): number {
  if (promo.discountType === 'percentage') {
    return Math.round((orderValue * promo.discountValue / 100) * 100) / 100;
  } else {
    // Fixed discount - cannot exceed order value
    return Math.min(promo.discountValue, orderValue);
  }
}

/**
 * Validate a promo code and calculate the discount
 */
export function validatePromoCode(
  code: string,
  boxType: string
): PromoValidationResult {
  // Empty code is valid (no discount applied)
  if (!code || code.trim() === '') {
    return { valid: true };
  }

  const promo = findPromoCode(code);

  // Check if promo code exists
  if (!promo) {
    return {
      valid: false,
      error: 'Невалиден промо код',
    };
  }

  // Check if promo code is active
  if (!promo.isActive) {
    return {
      valid: false,
      error: 'Този промо код вече не е активен',
    };
  }

  // Check validity dates
  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    return {
      valid: false,
      error: 'Този промо код все още не е активен',
    };
  }
  if (promo.validUntil && now > promo.validUntil) {
    return {
      valid: false,
      error: 'Този промо код е изтекъл',
    };
  }

  // Check max uses
  if (promo.maxUses !== undefined && promo.currentUses >= promo.maxUses) {
    return {
      valid: false,
      error: 'Този промо код е достигнал максималния брой използвания',
    };
  }

  // Get order value
  const orderValue = BOX_PRICES[boxType];
  if (!orderValue) {
    return {
      valid: false,
      error: 'Невалиден тип кутия',
    };
  }

  // Check minimum order value
  if (promo.minOrderValue && orderValue < promo.minOrderValue) {
    return {
      valid: false,
      error: `Минимална стойност на поръчката: ${promo.minOrderValue.toFixed(2)} лв.`,
    };
  }

  // Calculate discount
  const discountAmount = calculateDiscountAmount(promo, orderValue);

  const appliedDiscount: AppliedDiscount = {
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
    description: promo.description,
  };

  return {
    valid: true,
    discount: appliedDiscount,
  };
}

/**
 * Get the price for a box type
 */
export function getBoxPrice(boxType: string): number | null {
  return BOX_PRICES[boxType] ?? null;
}

/**
 * Calculate the final price after discount
 */
export function calculateFinalPrice(
  boxType: string,
  discount?: AppliedDiscount
): { originalPrice: number; finalPrice: number; discountAmount: number } | null {
  const originalPrice = BOX_PRICES[boxType];
  if (!originalPrice) {
    return null;
  }

  const discountAmount = discount?.discountAmount ?? 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    originalPrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountAmount,
  };
}

/**
 * Format discount for display
 */
export function formatDiscount(discount: AppliedDiscount): string {
  if (discount.discountType === 'percentage') {
    return `-${discount.discountValue}%`;
  } else {
    return `-${discount.discountAmount.toFixed(2)} лв.`;
  }
}
