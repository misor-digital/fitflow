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
 * Format a price with currency symbol (EUR)
 * @param price - The price in EUR
 * @returns Formatted price string (e.g., "24.90 €")
 */
export function formatPriceEur(price: number): string {
  return `${formatPrice(price)} €`;
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
 * Format savings amount in EUR
 * @param amountEur - Savings in EUR
 * @returns Formatted savings string (e.g., "Спестяваш 2.49 €")
 */
export function formatSavings(amountEur: number): string {
  return `Спестяваш ${formatPrice(amountEur)} €`;
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
