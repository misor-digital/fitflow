// Meta Pixel exports (browser-side)
export {
  isPixelAvailable,
  trackViewContent,
  trackInitiateCheckout,
  trackLead,
} from './metaPixel';

// Meta CAPI exports (server-side)
export {
  // Core functions
  sendMetaEvent,
  sendMetaEvents,
  hashForMeta,
  generateEventId,
  // Helper functions
  trackLeadCapi,
  trackViewContentCapi,
  trackInitiateCheckoutCapi,
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
