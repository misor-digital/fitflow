/**
 * Catalog data access layer
 * Server-only functions for fetching box types, options, and site config from Supabase
 *
 * Caching strategy:
 *   • `unstable_cache` — cross-request data cache (TTL 300 s, tag "catalog").
 *   • `React.cache`   — per-request deduplication on top of the data cache.
 *
 * Admin mutations call `revalidateDataTag(TAG_CATALOG)` to bust the cache
 * immediately after writes.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BoxTypeRow, OptionRow, OptionSetId } from '@/lib/supabase';
import type { PriceInfo } from '@/lib/catalog';
import { TAG_CATALOG } from './cache-tags';

// ============================================================================
// Box Types
// ============================================================================

/**
 * Get all enabled box types, sorted by sort_order.
 * Cached across requests for 5 min via unstable_cache (tag: catalog).
 * React.cache() deduplicates within a single render pass.
 */
export const getBoxTypes = cache(
  unstable_cache(
    async (): Promise<BoxTypeRow[]> => {
      const { data, error } = await supabaseAdmin
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
    },
    ['box-types'],
    { revalidate: 300, tags: [TAG_CATALOG] },
  ),
);

/**
 * Get a single box type by ID.
 * Reads from the cached box types list — no extra DB call.
 */
export const getBoxTypeById = cache(async (id: string): Promise<BoxTypeRow | null> => {
  const types = await getBoxTypes();
  return types.find((bt) => bt.id === id) ?? null;
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
 * Fetch ALL enabled options in a single DB call.
 * Cached across requests for 5 min (tag: catalog).
 *
 * Every per-set accessor (getOptions, getOptionLabels, getColors …)
 * filters from this cached result, so navigating /admin/orders no longer
 * fires 5 separate option queries.
 */
export const getAllOptions = cache(
  unstable_cache(
    async (): Promise<OptionRow[]> => {
      const { data, error } = await supabaseAdmin
        .from('options')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching all options:', error);
        return [];
      }

      return data || [];
    },
    ['all-options'],
    { revalidate: 300, tags: [TAG_CATALOG] },
  ),
);

/**
 * Get all enabled options for a specific option set.
 * Reads from the cached full option list — no extra DB call.
 */
export const getOptions = cache(async (optionSetId: OptionSetId): Promise<OptionRow[]> => {
  const all = await getAllOptions();
  return all.filter((o) => o.option_set_id === optionSetId);
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
 * Get a site config value by key.
 * Cached across requests for 5 min (tag: catalog).
 */
export const getSiteConfig = cache(
  unstable_cache(
    async (key: string): Promise<string | null> => {
      const { data, error } = await supabaseAdmin
        .from('site_config')
        .select('value')
        .eq('key', key)
        .single();

      if (error || !data) {
        return null;
      }

      return (data as { value: string }).value;
    },
    ['site-config'],
    { revalidate: 300, tags: [TAG_CATALOG] },
  ),
);

/**
 * Upsert a site config value (insert or update on conflict).
 * Uses service-role client — bypasses RLS.
 */
export async function upsertSiteConfig(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('site_config')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting site_config key "${key}":`, error);
    throw error;
  }
}

/**
 * The fixed BGN/EUR peg rate used by the Bulgarian Currency Board.
 * Last-resort fallback only used on very first cold start if the DB is unreachable.
 */
const DEFAULT_EUR_TO_BGN_RATE = 1.9558;

/**
 * Get EUR to BGN conversion rate.
 *
 * Wrapped in its own `unstable_cache` (1 hour, tag: catalog) so that once a
 * valid rate is fetched from the DB it survives even if subsequent
 * `getSiteConfig` calls fail (their 5 min TTL is shorter). The hardcoded
 * constant is only reached on a true cold start with no DB connectivity.
 */
export const getEurToBgnRate = cache(
  unstable_cache(
    async (): Promise<number> => {
      const { data, error } = await supabaseAdmin
        .from('site_config')
        .select('value')
        .eq('key', 'EUR_TO_BGN_RATE')
        .single();

      if (error || !data) {
        console.warn('EUR_TO_BGN_RATE not found in site_config — using default 1.9558');
        return DEFAULT_EUR_TO_BGN_RATE;
      }

      const rate = parseFloat((data as { value: string }).value);
      if (isNaN(rate) || rate <= 0) {
        console.warn(`Invalid EUR_TO_BGN_RATE value "${(data as { value: string }).value}" — using default 1.9558`);
        return DEFAULT_EUR_TO_BGN_RATE;
      }

      return rate;
    },
    ['eur-to-bgn-rate'],
    { revalidate: 3600, tags: [TAG_CATALOG] },
  ),
);

// ============================================================================
// Price Calculation (Server-side only)
// ============================================================================

// PriceInfo is now imported from @/lib/catalog/types and re-exported above

/**
 * Get all box prices in a single database call using Supabase RPC.
 * Cached across requests for 5 min (tag: catalog).
 * When promoCode is supplied the cache key includes it so per-promo
 * results are cached independently.
 */
export const getAllBoxPrices = cache(async (promoCode: string | null | undefined): Promise<PriceInfo[]> => {
  // Normalise to null so the cache key is stable
  const normalisedPromo = promoCode || null;
  return _getAllBoxPricesInner(normalisedPromo);
});

const _getAllBoxPricesInner = unstable_cache(
  async (promoCode: string | null): Promise<PriceInfo[]> => {
    const { data, error } = await supabaseAdmin
      .rpc('calculate_box_prices', { p_promo_code: promoCode });

    if (error) {
      console.error('Error calling calculate_box_prices:', error);
      // Return empty array instead of throwing — allows ISR pages to
      // prerender gracefully when Supabase is unreachable (e.g. CI).
      return [];
    }

    if (!data || data.length === 0) {
      return [];
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
  },
  ['box-prices'],
  { revalidate: 300, tags: [TAG_CATALOG] },
);

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
