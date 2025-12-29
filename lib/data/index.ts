/**
 * Data access layer module
 * Server-only functions for fetching business data from Supabase
 */

// Catalog data (box types, options, site config)
export {
  getBoxTypes,
  getBoxTypeById,
  getBoxPricesEur,
  getBoxTypeNames,
  getOptions,
  getOptionLabels,
  getColors,
  getColorNames,
  getSiteConfig,
  getEurToBgnRate,
  getAllBoxPrices,
  getAllBoxPricesMap,
  calculatePrice,
  formatPrice,
  eurToBgn,
} from './catalog';

// Promo code data
export {
  validatePromoCode,
  getDiscountPercent,
  isValidPromoCode,
  incrementPromoCodeUsage,
  getAppliedPromo,
  type AppliedPromo,
} from './promo';
