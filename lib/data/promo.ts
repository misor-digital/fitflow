/**
 * Promo code data access layer
 * Server-only functions for validating and managing promo codes
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PromoCodeRow } from '@/lib/supabase';

/**
 * Validate a promo code and return the promo data if valid
 * Checks: enabled, date range, usage limits
 */
export async function validatePromoCode(code: string | null | undefined): Promise<PromoCodeRow | null> {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .ilike('code', normalizedCode)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const promo = data;

  // Check date range
  const now = new Date();
  
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return null; // Not yet active
  }
  
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    return null; // Expired
  }

  // Check usage limit
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return null; // Usage limit reached
  }

  return promo;
}

/**
 * Get discount percentage for a promo code
 * Returns 0 if code is invalid
 */
export async function getDiscountPercent(promoCode: string | null | undefined): Promise<number> {
  if (!promoCode) {
    return 0;
  }

  const promo = await validatePromoCode(promoCode);
  return promo?.discount_percent ?? 0;
}

/**
 * Check if a promo code is valid (quick validation)
 */
export async function isValidPromoCode(code: string | null | undefined): Promise<boolean> {
  const promo = await validatePromoCode(code);
  return promo !== null;
}

/**
 * Atomically increment the usage count for a promo code.
 * Uses an RPC function to avoid read-then-write race conditions.
 */
export async function incrementPromoCodeUsage(code: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_promo_usage', {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    console.error('Error incrementing promo code usage:', error);
    throw new Error('Failed to increment promo code usage');
  }
}

/**
 * Applied promo info for display
 */
export interface AppliedPromo {
  code: string;
  discountPercent: number;
}

/**
 * Get applied promo info for display purposes
 */
export async function getAppliedPromo(code: string | null | undefined): Promise<AppliedPromo | null> {
  const promo = await validatePromoCode(code);
  
  if (!promo) {
    return null;
  }

  return {
    code: promo.code,
    discountPercent: promo.discount_percent,
  };
}
