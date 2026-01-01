// Meta Pixel exports
export {
  isPixelAvailable,
  trackViewContent,
  trackInitiateCheckout,
  trackLead,
} from './metaPixel';

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
