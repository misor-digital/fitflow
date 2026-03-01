/**
 * Centralised cache tag constants and revalidation helper.
 *
 * Every `unstable_cache` call in the DAL references a tag from this file.
 * Admin mutation routes call `revalidateDataTag(...)` after writes so the
 * Next.js data cache is busted immediately instead of waiting for TTL expiry.
 */

import 'server-only';
import { revalidateTag } from 'next/cache';

// ---------------------------------------------------------------------------
// Tag constants (keep alphabetical)
// ---------------------------------------------------------------------------

/** Box types, prices, EUR→BGN rate, options, colors */
export const TAG_CATALOG = 'catalog';

/** Customer aggregate stats (counts, subscriber count) */
export const TAG_CUSTOMERS = 'customers';

/** Delivery cycles, cycle items, revealed state */
export const TAG_DELIVERY = 'delivery';

/** Email aggregate stats (counts by status/type) */
export const TAG_EMAIL_STATS = 'email-stats';

/** Order aggregate stats (total count) */
export const TAG_ORDERS = 'orders';

/** Promo codes */
export const TAG_PROMO = 'promo';

/** Site-level config rows (delivery day, feature flags, etc.) */
export const TAG_SITE_CONFIG = 'site-config';

/** Subscription aggregate stats (counts, MRR) */
export const TAG_SUBSCRIPTIONS = 'subscriptions';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Bust one or more data-cache tags.
 * Call this inside admin mutation route handlers AFTER the write succeeds.
 *
 * ```ts
 * await createDeliveryCycle(data);
 * revalidateDataTag(TAG_DELIVERY);
 * ```
 */
export function revalidateDataTag(...tags: string[]): void {
  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }
}
