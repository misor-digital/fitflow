/**
 * Subscription Analytics Tracking
 *
 * Client-side analytics events for subscription lifecycle and box page views.
 * Fires events to both GA4 and Meta Pixel.
 */

import { isGA4Available } from '@/lib/analytics/ga4';
import { isPixelAvailable } from '@/lib/analytics/metaPixel';

// ============================================================================
// Subscription lifecycle events
// ============================================================================

/**
 * Track when a new subscription is created.
 */
export function trackSubscriptionCreated(
  boxType: string,
  frequency: string,
  price: number,
): void {
  if (isGA4Available()) {
    window.gtag!('event', 'subscribe', {
      box_type: boxType,
      frequency,
      value: price,
      currency: 'EUR',
    });
  }
  if (isPixelAvailable()) {
    window.fbq!('trackCustom', 'Subscribe', {
      box_type: boxType,
      frequency,
      value: price,
      currency: 'EUR',
    });
  }
}

/**
 * Track when a subscription is paused.
 */
export function trackSubscriptionPaused(boxType: string): void {
  if (isGA4Available()) {
    window.gtag!('event', 'subscription_paused', { box_type: boxType });
  }
}

/**
 * Track when a subscription is cancelled.
 */
export function trackSubscriptionCancelled(boxType: string, reason: string): void {
  if (isGA4Available()) {
    window.gtag!('event', 'subscription_cancelled', {
      box_type: boxType,
      reason,
    });
  }
}

// ============================================================================
// Box page view events
// ============================================================================

/**
 * Track when the mystery box page is viewed.
 */
export function trackMysteryBoxViewed(price: number): void {
  if (isGA4Available()) {
    window.gtag!('event', 'view_item', {
      item_name: 'Mystery Box',
      value: price,
      currency: 'EUR',
    });
  }
  if (isPixelAvailable()) {
    window.fbq!('track', 'ViewContent', {
      content_name: 'Mystery Box',
      value: price,
      currency: 'EUR',
    });
  }
}

/**
 * Track when the revealed box page is viewed.
 */
export function trackRevealedBoxViewed(price: number): void {
  if (isGA4Available()) {
    window.gtag!('event', 'view_item', {
      item_name: 'Revealed Box',
      value: price,
      currency: 'EUR',
    });
  }
  if (isPixelAvailable()) {
    window.fbq!('track', 'ViewContent', {
      content_name: 'Revealed Box',
      value: price,
      currency: 'EUR',
    });
  }
}
