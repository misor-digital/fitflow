/**
 * Formatting Utilities
 * 
 * Centralized formatting functions for prices and display values.
 * Use these everywhere to ensure consistent formatting.
 */

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Format a price with 2 decimal places
 * @param price - The price to format
 * @returns Formatted price string (e.g., "24.90")
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Format a price with currency symbol (BGN)
 * @param price - The price in BGN
 * @returns Formatted price string (e.g., "24.90 лв")
 */
export function formatPriceBgn(price: number): string {
  return `${formatPrice(price)} лв`;
}

/**
 * Format a price with currency symbol (EUR)
 * @param price - The price in EUR
 * @returns Formatted price string (e.g., "24.90 €")
 */
export function formatPriceEur(price: number): string {
  return `${formatPrice(price)} €`;
}

/**
 * Format a price in both currencies
 * @param priceEur - The price in EUR
 * @param priceBgn - The price in BGN
 * @returns Formatted price string (e.g., "48.70 лв / 24.90 €")
 */
export function formatPriceDual(priceEur: number, priceBgn: number): string {
  return `${formatPrice(priceBgn)} лв / ${formatPrice(priceEur)} €`;
}

/**
 * Format a discount percentage
 * @param percent - The discount percentage
 * @returns Formatted percentage string (e.g., "-10%")
 */
export function formatDiscount(percent: number): string {
  return `-${percent}%`;
}

/**
 * Format savings amount in both currencies
 * @param amountEur - Savings in EUR
 * @param amountBgn - Savings in BGN
 * @returns Formatted savings string (e.g., "Спестяваш 4.87 лв / 2.49 €")
 */
export function formatSavings(amountEur: number, amountBgn: number): string {
  return `Спестяваш ${formatPrice(amountBgn)} лв / ${formatPrice(amountEur)} €`;
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Fixed EUR to BGN conversion rate
 * This is the official fixed rate for Bulgaria
 */
export const EUR_TO_BGN_RATE = 1.9558;

/**
 * Convert EUR to BGN
 * @param eur - Amount in EUR
 * @returns Amount in BGN (rounded to 2 decimal places)
 */
export function eurToBgn(eur: number): number {
  return Math.round(eur * EUR_TO_BGN_RATE * 100) / 100;
}

/**
 * Convert BGN to EUR
 * @param bgn - Amount in BGN
 * @returns Amount in EUR (rounded to 2 decimal places)
 */
export function bgnToEur(bgn: number): number {
  return Math.round((bgn / EUR_TO_BGN_RATE) * 100) / 100;
}

// ============================================================================
// Discount Calculation
// ============================================================================

/**
 * Calculate discount amount
 * @param originalPrice - Original price
 * @param discountPercent - Discount percentage (0-100)
 * @returns Discount amount
 */
export function calculateDiscountAmount(
  originalPrice: number,
  discountPercent: number
): number {
  return Math.round((discountPercent / 100) * originalPrice * 100) / 100;
}

/**
 * Calculate final price after discount
 * @param originalPrice - Original price
 * @param discountPercent - Discount percentage (0-100)
 * @returns Final price after discount
 */
export function calculateFinalPrice(
  originalPrice: number,
  discountPercent: number
): number {
  return Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100;
}
