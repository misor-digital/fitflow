/**
 * Marketing Click Token Utilities
 * 
 * Creates signed, tamper-resistant click tokens for marketing campaign attribution.
 * Tokens are included in email CTA links and resolved server-side during preorder creation.
 * 
 * Token format: base64url(payload).signature
 * Payload contains: campaign_id, recipient_id, timestamp
 */

import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface ClickTokenPayload {
  /** Campaign ID */
  c: string;
  /** Recipient ID (nullable) */
  r: string | null;
  /** Timestamp for uniqueness */
  t: number;
  /** UTM campaign identifier */
  u: string;
}

export interface ResolvedClickToken {
  campaignId: string;
  recipientId: string | null;
  clickId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

export interface MarketingClickRow {
  id: string;
  campaign_id: string;
  recipient_id: string | null;
  click_token: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  created_at: string;
}

// ============================================================================
// Secret Key Management
// ============================================================================

/**
 * Get the secret key for signing click tokens
 * Uses CLICK_TOKEN_SECRET or falls back to SUPABASE_SECRET_KEY
 */
function getClickTokenSecret(): string {
  const secret = process.env.CLICK_TOKEN_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error('CLICK_TOKEN_SECRET or SUPABASE_SECRET_KEY must be set');
  }
  return secret;
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a signed click token for a campaign + recipient
 * 
 * @param campaignId - Campaign UUID
 * @param recipientId - Recipient UUID (optional)
 * @param utmCampaign - UTM campaign identifier (e.g., campaign name/slug)
 * @returns Signed token string safe for URL inclusion
 */
export function generateClickToken(
  campaignId: string,
  recipientId: string | null,
  utmCampaign: string
): string {
  const secret = getClickTokenSecret();
  
  // Create payload
  const payload: ClickTokenPayload = {
    c: campaignId,
    r: recipientId,
    t: Date.now(),
    u: utmCampaign,
  };
  
  // Base64url encode the payload
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create HMAC signature
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  
  // Return token as payload.signature
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a click token signature without database lookup
 * 
 * @param token - The signed token to verify
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyClickToken(token: string): ClickTokenPayload | null {
  try {
    const secret = getClickTokenSecret();
    
    // Split token into payload and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }
    
    const [encodedPayload, providedSignature] = parts;
    
    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');
    
    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(providedSignature, expectedSignature)) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as ClickTokenPayload;
    
    // Validate required fields
    if (!payload.c || !payload.u) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// ============================================================================
// Token Resolution (Server-Side)
// ============================================================================

/**
 * Resolve a click token to attribution data
 * Creates a click record if it doesn't exist (lazy creation)
 * 
 * @param token - The click token from the mc URL parameter
 * @returns Resolved attribution data or null if invalid
 */
export async function resolveClickToken(token: string): Promise<ResolvedClickToken | null> {
  try {
    // Verify token signature
    const payload = verifyClickToken(token);
    if (!payload) {
      console.warn('Invalid click token signature');
      return null;
    }
    
    // Check if click record already exists
    const { data: existingClick, error: lookupError } = await supabase
      .from('marketing_clicks')
      .select('*')
      .eq('click_token', token)
      .single();
    
    if (existingClick && !lookupError) {
      // Return existing click data
      const click = existingClick as MarketingClickRow;
      return {
        campaignId: click.campaign_id,
        recipientId: click.recipient_id,
        clickId: click.id,
        utmSource: click.utm_source,
        utmMedium: click.utm_medium,
        utmCampaign: click.utm_campaign,
      };
    }
    
    // Create new click record (lazy creation on first preorder)
    const { data: newClick, error: insertError } = await supabase
      .from('marketing_clicks')
      .insert({
        campaign_id: payload.c,
        recipient_id: payload.r,
        click_token: token,
        utm_source: 'email',
        utm_medium: 'campaign',
        utm_campaign: payload.u,
      } as never)
      .select()
      .single();
    
    if (insertError) {
      // Handle race condition - another request may have created it
      if (insertError.code === '23505') { // Unique violation
        const { data: retryClick } = await supabase
          .from('marketing_clicks')
          .select('*')
          .eq('click_token', token)
          .single();
        
        if (retryClick) {
          const click = retryClick as MarketingClickRow;
          return {
            campaignId: click.campaign_id,
            recipientId: click.recipient_id,
            clickId: click.id,
            utmSource: click.utm_source,
            utmMedium: click.utm_medium,
            utmCampaign: click.utm_campaign,
          };
        }
      }
      
      console.error('Error creating click record:', insertError);
      return null;
    }
    
    const click = newClick as MarketingClickRow;
    return {
      campaignId: click.campaign_id,
      recipientId: click.recipient_id,
      clickId: click.id,
      utmSource: click.utm_source,
      utmMedium: click.utm_medium,
      utmCampaign: click.utm_campaign,
    };
  } catch (error) {
    console.error('Error resolving click token:', error);
    return null;
  }
}

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generate a complete CTA URL with click token and UTM parameters
 * 
 * @param campaignId - Campaign UUID
 * @param recipientId - Recipient UUID (optional)
 * @param utmCampaign - UTM campaign identifier
 * @param promoCode - Optional promo code to include
 * @returns Full URL with mc token and UTM parameters
 */
export function generateCampaignCtaUrl(
  campaignId: string,
  recipientId: string | null,
  utmCampaign: string,
  promoCode?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg';
  const token = generateClickToken(campaignId, recipientId, utmCampaign);
  
  const params = new URLSearchParams();
  params.set('mc', token);
  params.set('utm_source', 'email');
  params.set('utm_medium', 'campaign');
  params.set('utm_campaign', utmCampaign);
  
  if (promoCode) {
    params.set('promocode', promoCode);
  }
  
  return `${baseUrl}/?${params.toString()}`;
}

/**
 * Generate a click token URL for a specific recipient
 * Used when sending campaign emails
 * 
 * @param campaignId - Campaign UUID
 * @param campaignName - Campaign name (used as utm_campaign)
 * @param recipientId - Recipient UUID
 * @param discountPercent - Discount percentage (used to generate promo code)
 * @returns Full URL with mc token and UTM parameters
 */
export function generateRecipientCtaUrl(
  campaignId: string,
  campaignName: string,
  recipientId: string,
  discountPercent?: number
): string {
  // Sanitize campaign name for URL (lowercase, replace spaces with underscores)
  const utmCampaign = campaignName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
  
  // Generate promo code from discount percent if provided
  const promoCode = discountPercent ? `FITFLOW${discountPercent}` : undefined;
  
  return generateCampaignCtaUrl(campaignId, recipientId, utmCampaign, promoCode);
}
