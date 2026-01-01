/**
 * Meta Pixel event tracking utilities
 * 
 * This module provides type-safe functions for tracking Meta Pixel events.
 * Events are only fired if the user has given marketing consent and the pixel is loaded.
 * 
 * Standard events implemented:
 * - PageView: Automatically fired by the pixel on every page load
 * - ViewContent: Fired on landing page to indicate core offer/content
 * - InitiateCheckout: Fired when user starts interacting with the form
 * - Lead: Fired on successful form submission (primary conversion)
 */

// Extend Window interface to include fbq
declare global {
  interface Window {
    fbq?: (
      action: 'track' | 'init' | 'trackCustom',
      eventName: string,
      params?: Record<string, unknown>
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
 * Should be fired when user starts interacting with the form
 * (e.g., first input focus or CTA button click)
 * Must fire BEFORE Lead, not instead of it
 */
export const trackInitiateCheckout = (): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'InitiateCheckout');
  }
};

/**
 * Track Lead event - PRIMARY CONVERSION
 * Should be fired ONLY after a successful form submission
 * This is the main conversion event for Meta Ads optimization
 */
export const trackLead = (): void => {
  if (isPixelAvailable()) {
    window.fbq!('track', 'Lead');
  }
};
