/**
 * Meta Pixel event tracking utilities
 * 
 * This module provides type-safe functions for tracking Meta Pixel events.
 * Events are only fired if the user has given marketing consent and the pixel is loaded.
 * 
 * Standard events implemented:
 * - PageView: Automatically fired by the pixel on every page load
 * - ViewContent: Fired on landing page to indicate core offer/content
 * - InitiateCheckout: Fired when user enters the order form
 * - Lead: Fired when user completes contact info (mid-funnel intent signal)
 * - Purchase: Fired on successful order completion (primary conversion)
 */

// Extend Window interface to include fbq
declare global {
  interface Window {
    fbq?: (
      action: 'track' | 'init' | 'trackCustom' | 'consent',
      eventName: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;
  }
}

/**
 * Check if Meta Pixel is available
 */
export const isPixelAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Track ViewContent event
 * Should be fired once on landing page load
 * Do NOT fire on thank-you page, privacy policy, or other utility pages
 */
export const trackViewContent = (): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'ViewContent');
  }
};

/**
 * Track InitiateCheckout event
 * Should be fired when user enters the order form (Step 1 mount)
 * Must fire BEFORE Lead, not instead of it
 */
export const trackInitiateCheckout = (): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'InitiateCheckout');
  }
};

/**
 * Track Lead event - MID-FUNNEL INTENT SIGNAL
 * Should be fired when user completes contact & delivery details (Step 3 → Step 4)
 * Indicates high-intent user who provided personal data
 */
export const trackLead = (): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'Lead');
  }
};

/**
 * Track Purchase event - PRIMARY CONVERSION
 * Should be fired ONLY after a successful order creation
 * This is the main conversion event for Meta Ads optimization
 * Even without payment, a completed order = completed transaction
 */
export const trackPurchase = (params: {
  value: number;
  currency: string;
  contentName?: string;
  orderId?: string;
  eventId?: string;
}): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'Purchase', {
      value: params.value,
      currency: params.currency,
      content_name: params.contentName,
      order_id: params.orderId,
    }, params.eventId ? { eventID: params.eventId } : undefined);
  }
};
