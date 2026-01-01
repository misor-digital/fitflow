/**
 * Meta Conversions API (CAPI) Server-Side Event Tracking
 * 
 * This module provides server-side event tracking for Meta Pixel events.
 * CAPI sends events directly from the server to Meta, providing:
 * - Better data accuracy (not blocked by ad blockers)
 * - Improved attribution
 * - Browser + server deduplication via event_id
 * 
 * Required Environment Variables:
 * - META_PIXEL_ID: Your Meta Pixel ID
 * - META_CAPI_ACCESS_TOKEN: Your Conversions API access token
 * 
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */

// Meta CAPI endpoint
const META_CAPI_ENDPOINT = 'https://graph.facebook.com/v18.0';

// Event names matching browser pixel events
export type MetaEventName = 
  | 'PageView'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Lead';

// User data for matching (hashed on client, sent as-is here)
export interface MetaUserData {
  em?: string;        // Email (should be hashed with SHA256)
  ph?: string;        // Phone (should be hashed with SHA256)
  fn?: string;        // First name (should be hashed with SHA256)
  ln?: string;        // Last name (should be hashed with SHA256)
  ct?: string;        // City (should be hashed with SHA256)
  st?: string;        // State (should be hashed with SHA256)
  zp?: string;        // Zip code (should be hashed with SHA256)
  country?: string;   // Country (should be hashed with SHA256)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;       // Facebook click ID (from _fbc cookie)
  fbp?: string;       // Facebook browser ID (from _fbp cookie)
  external_id?: string; // Your user ID (should be hashed with SHA256)
}

// Custom data for the event
export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  order_id?: string;
}

// Server event structure
export interface MetaServerEvent {
  event_name: MetaEventName;
  event_time: number;
  event_id: string;           // For deduplication with browser pixel
  event_source_url: string;
  action_source: 'website';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

// Response from Meta API
interface MetaApiResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

/**
 * Hash a string using SHA256 for Meta CAPI
 * Meta requires certain user data fields to be hashed
 */
export async function hashForMeta(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique event ID for deduplication
 * This ID should be sent to both browser pixel and CAPI
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send event to Meta Conversions API
 */
export async function sendMetaEvent(event: MetaServerEvent): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('Meta CAPI: Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN environment variables');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const response = await fetch(
      `${META_CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [event],
        }),
      }
    );

    const result: MetaApiResponse = await response.json();

    if (result.error) {
      console.error('Meta CAPI Error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Meta CAPI Request Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send multiple events to Meta Conversions API (batch)
 */
export async function sendMetaEvents(events: MetaServerEvent[]): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('Meta CAPI: Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN environment variables');
    return { success: false, error: 'Missing configuration' };
  }

  if (events.length === 0) {
    return { success: true };
  }

  try {
    const response = await fetch(
      `${META_CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: events,
        }),
      }
    );

    const result: MetaApiResponse = await response.json();

    if (result.error) {
      console.error('Meta CAPI Error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Meta CAPI Request Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// HELPER FUNCTIONS FOR COMMON EVENTS
// ============================================

/**
 * Track Lead event via CAPI (primary conversion)
 * Call this from your API route after successful form submission
 */
export async function trackLeadCapi(params: {
  eventId: string;
  sourceUrl: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
}): Promise<{ success: boolean; error?: string }> {
  const event: MetaServerEvent = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.sourceUrl,
    action_source: 'website',
    user_data: params.userData,
    custom_data: params.customData,
  };

  return sendMetaEvent(event);
}

/**
 * Track ViewContent event via CAPI
 */
export async function trackViewContentCapi(params: {
  eventId: string;
  sourceUrl: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
}): Promise<{ success: boolean; error?: string }> {
  const event: MetaServerEvent = {
    event_name: 'ViewContent',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.sourceUrl,
    action_source: 'website',
    user_data: params.userData,
    custom_data: params.customData,
  };

  return sendMetaEvent(event);
}

/**
 * Track InitiateCheckout event via CAPI
 */
export async function trackInitiateCheckoutCapi(params: {
  eventId: string;
  sourceUrl: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
}): Promise<{ success: boolean; error?: string }> {
  const event: MetaServerEvent = {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.sourceUrl,
    action_source: 'website',
    user_data: params.userData,
    custom_data: params.customData,
  };

  return sendMetaEvent(event);
}
