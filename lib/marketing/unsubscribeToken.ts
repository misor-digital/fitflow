/**
 * Signed unsubscribe token utilities
 * Creates tamper-resistant, single-purpose unsubscribe links
 */

import { createHmac } from 'crypto';

/**
 * Get the secret key for signing unsubscribe tokens
 * Falls back to a derived key from SUPABASE_SECRET_KEY if not set
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET or SUPABASE_SECRET_KEY must be set');
  }
  return secret;
}

/**
 * Generate a signed unsubscribe token for a recipient
 * Token format: base64(email):signature
 * 
 * @param email - Recipient email address
 * @param campaignId - Optional campaign ID for tracking
 * @returns Signed token string
 */
export function generateUnsubscribeToken(
  email: string,
  campaignId?: string
): string {
  const secret = getUnsubscribeSecret();
  
  // Create payload with email and optional campaign
  const payload = JSON.stringify({
    e: email.toLowerCase(),
    c: campaignId || null,
    t: Date.now(), // Timestamp for uniqueness
  });
  
  // Base64 encode the payload
  const encodedPayload = Buffer.from(payload).toString('base64url');
  
  // Create HMAC signature
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  
  // Return token as payload.signature
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode an unsubscribe token
 * 
 * @param token - The signed token to verify
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyUnsubscribeToken(
  token: string
): { email: string; campaignId: string | null; timestamp: number } | null {
  try {
    const secret = getUnsubscribeSecret();
    
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
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    return {
      email: payload.e,
      campaignId: payload.c,
      timestamp: payload.t,
    };
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

/**
 * Generate a complete unsubscribe URL with signed token
 * 
 * @param email - Recipient email address
 * @param campaignId - Optional campaign ID
 * @returns Full unsubscribe URL
 */
export function generateSignedUnsubscribeUrl(
  email: string,
  campaignId?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg';
  const token = generateUnsubscribeToken(email, campaignId);
  
  return `${baseUrl}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
}
