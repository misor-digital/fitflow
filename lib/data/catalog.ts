/**
 * Catalog data access layer
 * Server-only functions for fetching box types, options, and site config from Supabase
 */

import { cache } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { BoxTypeRow, OptionRow, OptionSetId } from '@/lib/supabase/database.types';

// ============================================================================
// Box Types
// ============================================================================

/**
 * Get all enabled box types, sorted by sort_order
 * Cached for the duration of the request
 */
export const getBoxTypes = cache(async (): Promise<BoxTypeRow[]> => {
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
export const getBoxTypeById = cache(async (id: string): Promise<BoxTypeRow | null> => {
  const { data, error } = await supabase
    .from('box_types')
    .select('*')
    .eq('id', id)
    .eq('is_enabled', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching box type:', error);
    return null;
  }

  return data;
});

/**
 * Get box prices as a map (for compatibility with existing code)
 */
export const getBoxPricesEur = cache(async (): Promise<Record<string, number>> => {
  const boxTypes = await getBoxTypes();
  return boxTypes.reduce((acc, bt) => {
    acc[bt.id] = Number(bt.price_eur);
    return acc;
  }, {} as Record<string, number>);
});

/**
 * Get box type display names as a map
 */
export const getBoxTypeNames = cache(async (): Promise<Record<string, string>> => {
  const boxTypes = await getBoxTypes();
  return boxTypes.reduce((acc, bt) => {
    acc[bt.id] = bt.name;
    return acc;
  }, {} as Record<string, string>);
});

// ============================================================================
// Options
// ============================================================================

/**
 * Get all enabled options for a specific option set
 */
export const getOptions = cache(async (optionSetId: OptionSetId): Promise<OptionRow[]> => {
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
 * Get option labels as a map (for display purposes)
 */
export const getOptionLabels = cache(async (optionSetId: OptionSetId): Promise<Record<string, string>> => {
  const options = await getOptions(optionSetId);
  return options.reduce((acc, opt) => {
    acc[opt.id] = opt.label;
    return acc;
  }, {} as Record<string, string>);
});

/**
 * Get colors with hex values
 */
export const getColors = cache(async (): Promise<Array<{ id: string; label: string; hex: string }>> => {
  const options = await getOptions('colors');
  return options.map(opt => ({
    id: opt.id,
    label: opt.label,
    hex: opt.value || opt.id, // value contains hex, fallback to id
  }));
});

/**
 * Get color names map (hex -> label)
 */
export const getColorNames = cache(async (): Promise<Record<string, string>> => {
  const options = await getOptions('colors');
  return options.reduce((acc, opt) => {
    if (opt.value) {
      acc[opt.value] = opt.label;
    }
    return acc;
  }, {} as Record<string, string>);
});

// ============================================================================
// Site Config
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

  if (error || !data) {
    return null;
  }

  return (data as { value: string }).value;
});

/**
 * Get EUR to BGN conversion rate
 */
export const getEurToBgnRate = cache(async (): Promise<number> => {
  const value = await getSiteConfig('EUR_TO_BGN_RATE');
  if (value) {
    return parseFloat(value);
  }
  // Fallback to hardcoded value if not in DB
  return 1.9558;
});

// ============================================================================
// Price Calculation (Server-side only)
// ============================================================================

export interface PriceInfo {
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
 * This is the authoritative server-side price calculation
 */
export async function calculatePrice(
  boxTypeId: string,
  promoCode: string | null | undefined
): Promise<PriceInfo> {
  // Import here to avoid circular dependency
  const { getDiscountPercent } = await import('./promo');
  
  const boxType = await getBoxTypeById(boxTypeId);
  if (!boxType) {
    throw new Error(`Invalid box type: ${boxTypeId}`);
  }

  const eurToBgnRate = await getEurToBgnRate();
  const discountPercent = promoCode ? await getDiscountPercent(promoCode) : 0;

  const originalPriceEur = Number(boxType.price_eur);
  const originalPriceBgn = Math.round(originalPriceEur * eurToBgnRate * 100) / 100;

  const discountAmountEur = Math.round((discountPercent / 100) * originalPriceEur * 100) / 100;
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
    promoCode: discountPercent > 0 ? (promoCode ?? null) : null,
  };
}

/**
 * Format price with 2 decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Convert EUR to BGN using the configured rate
 */
export async function eurToBgn(eur: number): Promise<number> {
  const rate = await getEurToBgnRate();
  return Math.round(eur * rate * 100) / 100;
}
