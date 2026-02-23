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
  eurToBgn,
} from './catalog';

// Re-export formatPrice from its canonical location
export { formatPrice } from '@/lib/preorder/format';

// Promo code data
export {
  validatePromoCode,
  getDiscountPercent,
  isValidPromoCode,
  incrementPromoCodeUsage,
  getAppliedPromo,
  type AppliedPromo,
} from './promo';
