/**
 * Catalog data access layer
 * Server-only functions for fetching box types, options, and site config from Supabase
 * 
 */

import { cache } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { BoxTypeRow, OptionRow, OptionSetId } from '@/lib/supabase';
import type { PriceInfo } from '@/lib/preorder';

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
 * Throws error if not configured in database
 */
export const getEurToBgnRate = cache(async (): Promise<number> => {
  const value = await getSiteConfig('EUR_TO_BGN_RATE');
  if (!value) {
    throw new Error('EUR_TO_BGN_RATE not configured in site_config table');
  }
  const rate = parseFloat(value);
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid EUR_TO_BGN_RATE value: ${value}`);
  }
  return rate;
});

// ============================================================================
// Price Calculation (Server-side only)
// ============================================================================

// PriceInfo is now imported from @/lib/preorder/types and re-exported above

interface RpcBoxPriceRow {
  box_type_id: string;
  box_type_name: string;
  original_price_eur: number;
  original_price_bgn: number;
  discount_percent: number;
  discount_amount_eur: number;
  discount_amount_bgn: number;
  final_price_eur: number;
  final_price_bgn: number;
}

/**
 * Get all box prices in a single database call using Supabase RPC
 * This is the optimized version that eliminates multiple round-trips
 */
export const getAllBoxPrices = cache(async (promoCode: string | null | undefined): Promise<PriceInfo[]> => {
  // Use type assertion to work around Supabase client type limitations
  const { data, error } = await supabase.rpc('calculate_box_prices', {
    p_promo_code: promoCode || null,
  } as unknown as undefined) as { data: RpcBoxPriceRow[] | null; error: Error | null };

  if (error) {
    console.error('Error calling calculate_box_prices:', error);
    throw new Error('Failed to calculate prices. Please try again later.');
  }

  if (!data || data.length === 0) {
    throw new Error('No box types configured. Please contact support.');
  }

  return data.map((row) => ({
    boxTypeId: row.box_type_id,
    boxTypeName: row.box_type_name,
    originalPriceEur: Number(row.original_price_eur),
    originalPriceBgn: Number(row.original_price_bgn),
    discountPercent: row.discount_percent,
    discountAmountEur: Number(row.discount_amount_eur),
    discountAmountBgn: Number(row.discount_amount_bgn),
    finalPriceEur: Number(row.final_price_eur),
    finalPriceBgn: Number(row.final_price_bgn),
    promoCode: row.discount_percent > 0 ? (promoCode ?? null) : null,
  }));
});

/**
 * Get all box prices as a map keyed by box type ID
 */
export async function getAllBoxPricesMap(promoCode: string | null | undefined): Promise<Record<string, PriceInfo>> {
  const prices = await getAllBoxPrices(promoCode);
  return prices.reduce((acc, price) => {
    acc[price.boxTypeId] = price;
    return acc;
  }, {} as Record<string, PriceInfo>);
}

/**
 * Calculate price for a box type with optional promo code
 * This is the authoritative server-side price calculation
 * Uses the optimized getAllBoxPrices function
 */
export async function calculatePrice(
  boxTypeId: string,
  promoCode: string | null | undefined
): Promise<PriceInfo> {
  const prices = await getAllBoxPrices(promoCode);
  const price = prices.find(p => p.boxTypeId === boxTypeId);
  
  if (!price) {
    throw new Error(`Invalid box type: ${boxTypeId}`);
  }

  return price;
}

/**
 * Convert EUR to BGN using the configured rate
 */
export async function eurToBgn(eur: number): Promise<number> {
  const rate = await getEurToBgnRate();
  return Math.round(eur * rate * 100) / 100;
}
