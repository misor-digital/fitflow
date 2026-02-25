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
  upsertSiteConfig,
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
  listPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  getPromoCodeStats,
  derivePromoStatus,
  type AppliedPromo,
  type PromoCodeFilters,
  type PromoCodeListResult,
  type PromoCodeStats,
  type PromoStatus,
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
  getEarliestEligibleCycle,
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
  getOrdersBySubscription,
} from './subscriptions';

// Email campaigns
export {
  createCampaign,
  getCampaignById,
  getCampaignsPaginated,
  updateCampaign,
  updateCampaignStatus,
  incrementCampaignCounters,
  getScheduledCampaigns,
  getSendingCampaigns,
} from './email-campaigns';

export {
  addRecipients,
  getNextBatch,
  markRecipientSent,
  markRecipientFailed,
  markRecipientSkipped,
  updateRecipientStatus,
  getRecipientStats,
  getRecipientsPaginated,
} from './email-recipients';

export {
  logEmailSent,
  updateEmailLogStatus,
  updateEmailLogFromWebhook,
  getEmailLog,
  getEmailLogByEntity,
  getEmailStats,
} from './email-log';

export {
  getOrCreateMonthUsage,
  incrementUsage,
  canSendEmails,
  getUsageHistory,
  markAlertSent,
} from './email-usage';

export {
  recordCampaignAction,
  getCampaignHistory,
} from './email-campaign-history';

export { initializeEmailSystem } from './email-init';
