// Meta Pixel exports (browser-side)
export {
  isPixelAvailable,
  trackViewContent,
  trackInitiateCheckout,
  trackLead,
  trackPurchase,
} from './metaPixel';

// Meta CAPI exports (server-side)
export {
  // Core functions
  sendMetaEvent,
  sendMetaEvents,
  hashForMeta,
  generateEventId,
  buildCapiUserData,
  // Helper functions
  trackLeadCapi,
  trackViewContentCapi,
  trackInitiateCheckoutCapi,
  trackPurchaseCapi,
  trackSubscribeCapi,
  trackPageViewCapi,
  // Types
  type MetaEventName,
  type MetaUserData,
  type MetaCustomData,
  type MetaServerEvent,
} from './metaCapi';

// GA4 exports
export {
  isGA4Available,
  // Recommended events
  trackViewItem,
  trackBeginCheckout,
  trackGenerateLead,
  trackGAPurchase,
  // Funnel events
  trackFunnelStep,
  trackBoxSelection,
  trackPersonalizationChoice,
  // Form events
  trackFormInteraction,
  trackFormSubmit,
  // Promo events
  trackPromoCode,
  // Engagement events
  trackCTAClick,
  trackScrollDepth,
  // User properties
  setUserProperties,
  // Types
  type FunnelStep,
} from './ga4';
