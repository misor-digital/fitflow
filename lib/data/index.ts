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
export { formatPrice } from '@/lib/catalog/format';

// Promo code data
export {
  validatePromoCode,
  getDiscountPercent,
  isValidPromoCode,
  incrementPromoCodeUsage,
  getAppliedPromo,
  type AppliedPromo,
} from './promo';

// Address data
export {
  getAddressesByUser,
  getAddressById,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  countAddressesByUser,
} from './addresses';

// Order data
export {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrderByNumberAndEmail,
  getOrdersByUser,
  updateOrderStatus,
  getOrderStatusHistory,
  getOrdersCount,
  getOrdersPaginated,
} from './orders';

// Preorder conversion
export {
  getPreorderByToken,
  markPreorderConverted,
  getPreorderConversionStatus,
  getPreordersWithConversionInfo,
} from './preorder-conversion';

// Delivery cycles
export {
  getDeliveryCycles,
  getDeliveryCycleById,
  getUpcomingCycle,
  getCurrentRevealedCycle,
  getDeliveredCycles,
  createDeliveryCycle,
  updateDeliveryCycle,
  deleteDeliveryCycle,
  markCycleDelivered,
  revealCycle,
  archiveCycle,
  getCycleItems,
  getCycleItemById,
  createCycleItem,
  updateCycleItem,
  deleteCycleItem,
  reorderCycleItems,
  getDeliveryConfigMap,
  updateDeliveryConfig,
} from './delivery-cycles';

// Subscriptions
export {
  createSubscription,
  getSubscriptionById,
  getSubscriptionsByUser,
  getActiveSubscriptions,
  getSubscriptionsCount,
  getSubscriptionMRR,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  expireSubscription,
  updateSubscriptionPreferences,
  updateSubscriptionAddress,
  updateSubscriptionFrequency,
  generateOrdersForCycle,
  getSubscriptionHistory,
  getSubscriptionsPaginated,
  getSubscriptionsForCycle,
} from './subscriptions';
