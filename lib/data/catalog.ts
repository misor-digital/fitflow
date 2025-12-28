/**
 * Server-side data access layer for catalog/config data
 * All functions here fetch from Supabase and should only be called server-side
 */

import { cache } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { BoxType, PromoCode, Option, BoxTypeId } from '@/lib/supabase/types';

// ============================================================================
// BOX TYPES
// ============================================================================

/**
 * Get all enabled box types, sorted by sort_order
 * Cached for the duration of the request
 */
export const getBoxTypes = cache(async (): Promise<BoxType[]> => {
  const { data, error } = await supabase
    .from('box_types')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching box types:', error);
    throw new Error('Failed to load box types. Please try again later.');
  }

  if (!data || data.length === 0) {
    throw new Error('No box types configured. Please contact support.');
  }

  return data;
});

/**
 * Get a single box type by ID
 */
export const getBoxTypeById = cache(async (id: BoxTypeId | string): Promise<BoxType | null> => {
  const { data, error } = await supabase
    .from('box_types')
    .select('*')
    .eq('id', id)
    .eq('is_enabled', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching box type:', error);
    return null;
  }

  return data;
});

/**
 * Get box prices as a map (for backward compatibility)
 */
export const getBoxPricesMap = cache(async (): Promise<Record<string, number>> => {
  const boxTypes = await getBoxTypes();
  return boxTypes.reduce((acc, bt) => {
    acc[bt.id] = Number(bt.price_eur);
    return acc;
  }, {} as Record<string, number>);
});

/**
 * Get box type display names as a map
 */
export const getBoxTypeLabelsMap = cache(async (): Promise<Record<string, string>> => {
  const boxTypes = await getBoxTypes();
  return boxTypes.reduce((acc, bt) => {
    acc[bt.id] = bt.name;
    return acc;
  }, {} as Record<string, string>);
});

// ============================================================================
// PROMO CODES (Server-side only - never expose to client)
// ============================================================================

/**
 * Validate a promo code and return its details if valid
 * Returns null if code is invalid, expired, or disabled
 */
export async function validatePromoCode(code: string): Promise<PromoCode | null> {
  if (!code || typeof code !== 'string') return null;

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .ilike('code', normalizedCode)
    .eq('is_enabled', true)
    .single();

  if (error || !data) return null;

  // Check validity window
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) return null;
  if (data.ends_at && new Date(data.ends_at) < now) return null;

  // Check usage limits
  if (data.max_uses !== null && data.current_uses >= data.max_uses) return null;

  return data;
}

/**
 * Get discount percentage for a promo code (0 if invalid)
 */
export async function getPromoDiscountPercent(code: string | null | undefined): Promise<number> {
  if (!code) return 0;
  const promo = await validatePromoCode(code);
  return promo?.discount_percent ?? 0;
}

/**
 * Check if a promo code is valid (boolean check)
 */
export async function isValidPromoCode(code: string | null | undefined): Promise<boolean> {
  if (!code) return false;
  const promo = await validatePromoCode(code);
  return promo !== null;
}

/**
 * Increment promo code usage count (call after successful order)
 */
export async function incrementPromoCodeUsage(code: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  
  // Get current promo code
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('current_uses')
    .ilike('code', normalizedCode)
    .single();

  if (promo) {
    const currentUses = (promo as { current_uses: number }).current_uses;
    await supabase
      .from('promo_codes')
      .update({ current_uses: currentUses + 1 } as never)
      .ilike('code', normalizedCode);
  }
}

// ============================================================================
// OPTIONS (Sports, Flavors, Dietary, Colors, Sizes)
// ============================================================================

/**
 * Get all options for a specific option set
 */
export const getOptions = cache(async (optionSetId: string): Promise<Option[]> => {
  const { data, error } = await supabase
    .from('options')
    .select('*')
    .eq('option_set_id', optionSetId)
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error(`Error fetching options for ${optionSetId}:`, error);
    return [];
  }

  return data || [];
});

/**
 * Get options as a label map (id -> label)
 */
export const getOptionsLabelMap = cache(async (optionSetId: string): Promise<Record<string, string>> => {
  const options = await getOptions(optionSetId);
  return options.reduce((acc, opt) => {
    acc[opt.id] = opt.label;
    return acc;
  }, {} as Record<string, string>);
});

/**
 * Get color options with hex values
 */
export const getColorOptions = cache(async (): Promise<Array<{ id: string; label: string; hex: string }>> => {
  const options = await getOptions('colors');
  return options.map(opt => ({
    id: opt.id,
    label: opt.label,
    hex: opt.value || opt.id, // fallback to id if no value
  }));
});

/**
 * Get color hex to label map
 */
export const getColorLabelsMap = cache(async (): Promise<Record<string, string>> => {
  const options = await getOptions('colors');
  return options.reduce((acc, opt) => {
    if (opt.value) {
      acc[opt.value] = opt.label;
    }
    return acc;
  }, {} as Record<string, string>);
});

// Convenience functions for specific option sets
export const getSportsOptions = () => getOptions('sports');
export const getFlavorsOptions = () => getOptions('flavors');
export const getDietaryOptions = () => getOptions('dietary');
export const getSizesOptions = () => getOptions('sizes');

export const getSportsLabelsMap = () => getOptionsLabelMap('sports');
export const getFlavorsLabelsMap = () => getOptionsLabelMap('flavors');
export const getDietaryLabelsMap = () => getOptionsLabelMap('dietary');

// ============================================================================
// SITE CONFIG
// ============================================================================

/**
 * Get a site config value by key
 */
export const getSiteConfig = cache(async (key: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) return null;
  return (data as { value: string }).value;
});

/**
 * Get EUR to BGN exchange rate
 */
export const getEurToBgnRate = cache(async (): Promise<number> => {
  const rate = await getSiteConfig('EUR_TO_BGN_RATE');
  return rate ? parseFloat(rate) : 1.9558; // fallback to fixed rate
});

// ============================================================================
// PRICE CALCULATION (Server-side only)
// ============================================================================

export interface PriceCalculation {
  boxTypeId: string;
  boxTypeName: string;
  originalPriceEur: number;
  originalPriceBgn: number;
  discountPercent: number;
  discountAmountEur: number;
  discountAmountBgn: number;
  finalPriceEur: number;
  finalPriceBgn: number;
  promoCode: string | null;
}

/**
 * Calculate price for a box type with optional promo code
 * This is the authoritative price calculation - always use server-side
 */
export async function calculatePrice(
  boxTypeId: BoxTypeId | string,
  promoCode?: string | null
): Promise<PriceCalculation> {
  // Get box type
  const boxType = await getBoxTypeById(boxTypeId);
  if (!boxType) {
    throw new Error(`Invalid box type: ${boxTypeId}`);
  }

  // Get exchange rate
  const eurToBgnRate = await getEurToBgnRate();

  // Get promo discount
  const discountPercent = promoCode ? await getPromoDiscountPercent(promoCode) : 0;

  // Calculate prices
  const originalPriceEur = Number(boxType.price_eur);
  const originalPriceBgn = Math.round(originalPriceEur * eurToBgnRate * 100) / 100;
  
  const discountAmountEur = Math.round(originalPriceEur * (discountPercent / 100) * 100) / 100;
  const discountAmountBgn = Math.round(discountAmountEur * eurToBgnRate * 100) / 100;
  
  const finalPriceEur = Math.round((originalPriceEur - discountAmountEur) * 100) / 100;
  const finalPriceBgn = Math.round(finalPriceEur * eurToBgnRate * 100) / 100;

  return {
    boxTypeId: boxType.id,
    boxTypeName: boxType.name,
    originalPriceEur,
    originalPriceBgn,
    discountPercent,
    discountAmountEur,
    discountAmountBgn,
    finalPriceEur,
    finalPriceBgn,
    promoCode: discountPercent > 0 ? promoCode! : null,
  };
}

/**
 * Format price for display
 */
export function formatPrice(priceEur: number, priceBgn: number): string {
  return `${priceBgn.toFixed(2)} лв / ${priceEur.toFixed(2)} €`;
}

/**
 * Convert EUR to BGN using the configured rate
 */
export async function eurToBgn(eur: number): Promise<number> {
  const rate = await getEurToBgnRate();
  return Math.round(eur * rate * 100) / 100;
}
