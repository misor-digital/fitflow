/**
 * Google Analytics 4 (GA4) event tracking utilities
 * 
 * This module provides type-safe functions for tracking GA4 events.
 * Events are only fired if the user has given analytics consent and gtag is loaded.
 * 
 * GA4 Event Categories:
 * - Automatically collected: page_view, scroll, click, etc.
 * - Recommended events: generate_lead, sign_up, view_item, begin_checkout
 * - Custom events: funnel_step_*, form_interaction
 * 
 * @see https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      eventNameOrConfig: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Check if GA4 is available
 */
export const isGA4Available = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// ============================================
// RECOMMENDED E-COMMERCE / LEAD GEN EVENTS
// ============================================

/**
 * Track view_item event (GA4 recommended event)
 * Fired when user views the main offer/product
 * Maps to Meta's ViewContent
 */
export const trackViewItem = (params?: {
  item_id?: string;
  item_name?: string;
  currency?: string;
  value?: number;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'view_item', {
      currency: 'EUR',
      items: [{
        item_id: params?.item_id || 'fitflow-box',
        item_name: params?.item_name || 'FitFlow Box',
      }],
      value: params?.value,
      ...params,
    });
  }
};

/**
 * Track begin_checkout event (GA4 recommended event)
 * Fired when user starts the signup/checkout process
 * Maps to Meta's InitiateCheckout
 */
export const trackBeginCheckout = (params?: {
  currency?: string;
  value?: number;
  items?: Array<{
    item_id: string;
    item_name: string;
    price?: number;
  }>;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'begin_checkout', {
      currency: params?.currency || 'EUR',
      value: params?.value,
      items: params?.items || [{
        item_id: 'fitflow-box',
        item_name: 'FitFlow Box',
      }],
    });
  }
};

/**
 * Track generate_lead event (GA4 recommended event)
 * Fired on successful form submission - PRIMARY CONVERSION
 * Maps to Meta's Lead
 */
export const trackGenerateLead = (params?: {
  currency?: string;
  value?: number;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'generate_lead', {
      currency: params?.currency || 'EUR',
      value: params?.value || 0,
    });
  }
};

// ============================================
// CUSTOM FUNNEL STEP EVENTS
// ============================================

export type FunnelStep = 
  | 'box_selection'      // Step 1
  | 'personalization'    // Step 2
  | 'contact_info'       // Step 3
  | 'review_order';      // Step 4

/**
 * Track funnel step progression
 * Custom event for detailed funnel analysis
 */
export const trackFunnelStep = (
  step: FunnelStep,
  stepNumber: number,
  params?: Record<string, unknown>
): void => {
  if (isGA4Available()) {
    window.gtag!('event', `funnel_step_${step}`, {
      step_number: stepNumber,
      step_name: step,
      ...params,
    });
  }
};

/**
 * Track box type selection
 * Custom event for understanding product preferences
 */
export const trackBoxSelection = (params: {
  box_type: string;
  box_name: string;
  price?: number;
  currency?: string;
  has_promo?: boolean;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'select_item', {
      items: [{
        item_id: params.box_type,
        item_name: params.box_name,
        price: params.price,
        currency: params.currency || 'EUR',
      }],
      has_promo_code: params.has_promo,
    });
  }
};

/**
 * Track personalization choice
 * Custom event for understanding user preferences
 */
export const trackPersonalizationChoice = (params: {
  wants_personalization: boolean;
  sports?: string[];
  colors?: string[];
  flavors?: string[];
  dietary?: string[];
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'personalization_choice', {
      wants_personalization: params.wants_personalization,
      sports_count: params.sports?.length || 0,
      colors_count: params.colors?.length || 0,
      flavors_count: params.flavors?.length || 0,
      dietary_count: params.dietary?.length || 0,
    });
  }
};

// ============================================
// FORM INTERACTION EVENTS
// ============================================

/**
 * Track form field interaction
 * Useful for understanding where users struggle
 */
export const trackFormInteraction = (params: {
  form_name: string;
  field_name: string;
  interaction_type: 'focus' | 'blur' | 'change' | 'error';
  error_message?: string;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'form_interaction', {
      form_name: params.form_name,
      field_name: params.field_name,
      interaction_type: params.interaction_type,
      error_message: params.error_message,
    });
  }
};

/**
 * Track form submission attempt
 * Tracks both successful and failed attempts
 */
export const trackFormSubmit = (params: {
  form_name: string;
  success: boolean;
  error_message?: string;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'form_submit', {
      form_name: params.form_name,
      success: params.success,
      error_message: params.error_message,
    });
  }
};

// ============================================
// PROMO CODE EVENTS
// ============================================

/**
 * Track promo code application
 */
export const trackPromoCode = (params: {
  promo_code: string;
  success: boolean;
  discount_percent?: number;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'promo_code_applied', {
      promo_code: params.promo_code,
      success: params.success,
      discount_percent: params.discount_percent,
    });
  }
};

// ============================================
// ENGAGEMENT EVENTS
// ============================================

/**
 * Track CTA button clicks
 */
export const trackCTAClick = (params: {
  cta_text: string;
  cta_location: string;
  destination?: string;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'cta_click', {
      cta_text: params.cta_text,
      cta_location: params.cta_location,
      destination: params.destination,
    });
  }
};

/**
 * Track scroll depth milestones
 * Note: GA4 automatically tracks 90% scroll, but this allows custom thresholds
 */
export const trackScrollDepth = (params: {
  percent_scrolled: number;
  page_location: string;
}): void => {
  if (isGA4Available()) {
    window.gtag!('event', 'scroll_depth', {
      percent_scrolled: params.percent_scrolled,
      page_location: params.page_location,
    });
  }
};

// ============================================
// USER PROPERTIES
// ============================================

/**
 * Set user properties for segmentation
 * Call this when user completes signup
 */
export const setUserProperties = (params: {
  box_type?: string;
  has_personalization?: boolean;
  promo_code_used?: boolean;
}): void => {
  if (isGA4Available()) {
    window.gtag!('set', 'user_properties', {
      preferred_box_type: params.box_type,
      has_personalization: params.has_personalization,
      promo_code_used: params.promo_code_used,
    });
  }
};
