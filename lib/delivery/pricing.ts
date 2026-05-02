/**
 * Delivery Pricing
 *
 * Server-side helpers for fetching delivery fee configuration.
 * Prices are stored in the database and can be updated by admin.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DeliveryMethod } from '@/lib/order/types';

// ============================================================================
// Types
// ============================================================================

export interface DeliveryPricing {
  deliveryMethod: DeliveryMethod;
  priceEur: number;
  labelBg: string;
  isActive: boolean;
}

// ============================================================================
// Data Access
// ============================================================================

/** Fetch all active delivery pricing options. */
export async function getDeliveryPricing(): Promise<DeliveryPricing[]> {
  const { data, error } = await supabaseAdmin
    .from('delivery_pricing')
    .select('delivery_method, price_eur, label_bg, is_active')
    .eq('is_active', true)
    .order('price_eur', { ascending: true });

  if (error) {
    console.error('Failed to fetch delivery pricing:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    deliveryMethod: row.delivery_method as DeliveryMethod,
    priceEur: Number(row.price_eur),
    labelBg: row.label_bg,
    isActive: row.is_active,
  }));
}

/** Get the delivery fee for a specific method. Returns 0 if not found. */
export async function getDeliveryFee(deliveryMethod: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('delivery_pricing')
    .select('price_eur')
    .eq('delivery_method', deliveryMethod)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`Delivery fee not found for method "${deliveryMethod}":`, error);
    return 0;
  }

  return Number(data.price_eur);
}

/** Get all active pricing as a lookup map: { method → priceEur }. */
export async function getDeliveryPricingMap(): Promise<Record<string, number>> {
  const pricing = await getDeliveryPricing();
  const map: Record<string, number> = {};
  for (const p of pricing) {
    map[p.deliveryMethod] = p.priceEur;
  }
  return map;
}
