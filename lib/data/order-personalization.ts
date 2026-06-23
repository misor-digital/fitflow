/**
 * Order personalization (post-checkout) - Data Access Layer
 *
 * Server-only functions that let a customer finish box personalization from
 * the thank-you page right after checkout, authorized by a one-time token.
 * Uses supabaseAdmin (service_role) so guest orders (no session) are supported.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OrderRow, OrderStatus } from '@/lib/supabase/types';

/** Order statuses during which personalization may still be edited. */
const EDITABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing'];

/** Personalization fields a customer may set after checkout. */
export interface OrderPersonalizationUpdate {
  wants_personalization: boolean;
  sports: string[] | null;
  sport_other: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavor_other: string | null;
  dietary: string[] | null;
  dietary_other: string | null;
  size_upper: string | null;
  size_lower: string | null;
  additional_notes: string | null;
}

/**
 * Look up an order by its one-time personalization token.
 * Security-sensitive - NOT cached.
 *
 * Returns null if the token is unknown, expired, or the order is no longer
 * in an editable status.
 */
export async function getOrderByPersonalizationToken(
  token: string,
): Promise<OrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('personalization_token', token)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching order by personalization token:', error);
    }
    return null;
  }

  // Token expiry
  if (data.personalization_token_expires_at) {
    const expiresAt = new Date(data.personalization_token_expires_at);
    if (expiresAt < new Date()) {
      return null;
    }
  }

  // Order must still be editable
  if (!EDITABLE_STATUSES.includes(data.status)) {
    return null;
  }

  return data as OrderRow;
}

/**
 * Apply personalization to an order and clear the one-time token.
 * Single-use: the update only succeeds while the token is still present.
 */
export async function updateOrderPersonalization(
  orderId: string,
  prefs: OrderPersonalizationUpdate,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      ...prefs,
      personalization_token: null,
      personalization_token_expires_at: null,
    })
    .eq('id', orderId)
    .not('personalization_token', 'is', null)
    .select('id');

  if (error) {
    console.error('Error updating order personalization:', error);
    throw new Error('Failed to update order personalization.');
  }

  if (!data || data.length === 0) {
    throw new Error('Order not found or personalization already submitted.');
  }
}
