/**
 * Order-to-Subscription Conversion - Data Access Layer
 *
 * Server-only functions for the order-to-subscription conversion flow.
 * Uses supabaseAdmin (service_role) - bypasses RLS.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPreviousDeliveredCycle } from '@/lib/data/delivery-cycles';
import { getUserByEmail } from '@/lib/auth/get-user-by-email';
import type { OrderRow } from '@/lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

/** Fields selected for eligible-order queries */
const ELIGIBLE_ORDER_SELECT = [
  'id',
  'order_number',
  'customer_email',
  'customer_full_name',
  'customer_phone',
  'user_id',
  'box_type',
  'wants_personalization',
  'sports',
  'colors',
  'flavors',
  'dietary',
  'size_upper',
  'size_lower',
  'promo_code',
  'discount_percent',
  'original_price_eur',
  'final_price_eur',
  'subscription_conversion_status',
  'subscription_conversion_token',
  'created_at',
].join(', ');

export type EligibleOrder = Pick<
  OrderRow,
  | 'id'
  | 'order_number'
  | 'customer_email'
  | 'customer_full_name'
  | 'customer_phone'
  | 'user_id'
  | 'box_type'
  | 'wants_personalization'
  | 'sports'
  | 'colors'
  | 'flavors'
  | 'dietary'
  | 'size_upper'
  | 'size_lower'
  | 'promo_code'
  | 'discount_percent'
  | 'original_price_eur'
  | 'final_price_eur'
  | 'subscription_conversion_status'
  | 'subscription_conversion_token'
  | 'created_at'
> & { hasAccount: boolean };

export interface FindOrCreateResult {
  userId: string;
  loginUrl: string | null;
  isNew: boolean;
}

// ============================================================================
// Function 1: getEligibleOrdersForSubscription
// ============================================================================

/**
 * Query orders eligible for subscription conversion campaigns.
 *
 * - If no `cycleId`, defaults to the previous delivered cycle.
 * - Excludes subscription orders and already-converted orders.
 * - Guests (`user_id IS NULL`) are included.
 * - Deduplicates by `customer_email` (keeps most recent order per email).
 */
export async function getEligibleOrdersForSubscription(
  cycleId?: string,
): Promise<EligibleOrder[]> {
  // Resolve cycle
  const resolvedCycleId = cycleId ?? (await getPreviousDeliveredCycle())?.id;
  if (!resolvedCycleId) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ELIGIBLE_ORDER_SELECT)
    .in('order_type', ['onetime-mystery', 'onetime-revealed', 'direct'])
    .eq('status', 'delivered')
    .eq('delivery_cycle_id', resolvedCycleId)
    .is('converted_to_subscription_id', null)
    .or('subscription_conversion_status.is.null,subscription_conversion_status.eq.pending')
    .order('created_at', { ascending: false })
    .limit(10_000);

  if (error) {
    console.error('Error fetching eligible orders for subscription:', error);
    throw new Error('Failed to load eligible orders.');
  }

  if (!data || data.length === 0) return [];

  // Deduplicate by email - keep most recent (first in DESC-sorted list)
  const seen = new Map<string, EligibleOrder>();

  for (const row of data) {
    const order = row as unknown as Pick<
      OrderRow,
      | 'id'
      | 'order_number'
      | 'customer_email'
      | 'customer_full_name'
      | 'customer_phone'
      | 'user_id'
      | 'box_type'
      | 'wants_personalization'
      | 'sports'
      | 'colors'
      | 'flavors'
      | 'dietary'
      | 'size_upper'
      | 'size_lower'
      | 'promo_code'
      | 'discount_percent'
      | 'original_price_eur'
      | 'final_price_eur'
      | 'subscription_conversion_status'
      | 'subscription_conversion_token'
      | 'created_at'
    >;
    const key = order.customer_email.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...order, hasAccount: order.user_id !== null });
    }
  }

  return Array.from(seen.values());
}

// ============================================================================
// Function 1b: getAllCycleOrdersForCampaign
// ============================================================================

/**
 * Query ALL one-time orders for a delivery cycle - including converted ones.
 * Used by the admin campaign overview page for full visibility and accurate stats.
 *
 * Unlike `getEligibleOrdersForSubscription`, this does NOT filter out
 * `converted_to_subscription_id` or `subscription_conversion_status = 'converted'`.
 */
export async function getAllCycleOrdersForCampaign(
  cycleId?: string,
): Promise<EligibleOrder[]> {
  const resolvedCycleId = cycleId ?? (await getPreviousDeliveredCycle())?.id;
  if (!resolvedCycleId) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ELIGIBLE_ORDER_SELECT)
    .in('order_type', ['onetime-mystery', 'onetime-revealed', 'direct'])
    .eq('status', 'delivered')
    .eq('delivery_cycle_id', resolvedCycleId)
    .order('created_at', { ascending: false })
    .limit(10_000);

  if (error) {
    console.error('Error fetching all cycle orders for campaign:', error);
    throw new Error('Failed to load cycle orders.');
  }

  if (!data || data.length === 0) return [];

  // Deduplicate by email - keep most recent
  const seen = new Map<string, EligibleOrder>();

  for (const row of data) {
    const order = row as unknown as Pick<
      OrderRow,
      | 'id'
      | 'order_number'
      | 'customer_email'
      | 'customer_full_name'
      | 'customer_phone'
      | 'user_id'
      | 'box_type'
      | 'wants_personalization'
      | 'sports'
      | 'colors'
      | 'flavors'
      | 'dietary'
      | 'size_upper'
      | 'size_lower'
      | 'promo_code'
      | 'discount_percent'
      | 'original_price_eur'
      | 'final_price_eur'
      | 'subscription_conversion_status'
      | 'subscription_conversion_token'
      | 'created_at'
    >;
    const key = order.customer_email.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...order, hasAccount: order.user_id !== null });
    }
  }

  return Array.from(seen.values());
}

// ============================================================================
// Function 2: generateConversionTokens
// ============================================================================

/**
 * Batch-set conversion tokens for selected orders.
 * Only targets orders that are not already converted.
 * Returns count of updated rows.
 */
export async function generateConversionTokens(
  orderIds: string[],
): Promise<number> {
  if (orderIds.length === 0) return 0;

  let count = 0;
  const expiresAt = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const id of orderIds) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        subscription_conversion_token: crypto.randomUUID(),
        subscription_conversion_token_expires_at: expiresAt,
        subscription_conversion_status: 'pending',
      })
      .eq('id', id)
      .is('converted_to_subscription_id', null)
      .select('id');

    if (updateError) {
      console.error(
        `Error generating conversion token for order ${id}:`,
        updateError,
      );
      continue;
    }
    if (updated && updated.length > 0) count++;
  }

  return count;
}

// ============================================================================
// Function 3: getOrderByConversionToken
// ============================================================================

/**
 * Look up an order by its one-time conversion token.
 * Security-sensitive - NOT cached.
 *
 * Returns null if token not found, already converted, or expired.
 */
export async function getOrderByConversionToken(
  token: string,
): Promise<OrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('subscription_conversion_token', token)
    .eq('subscription_conversion_status', 'pending')
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching order by conversion token:', error);
    }
    return null;
  }

  // Check token expiry
  if (data.subscription_conversion_token_expires_at) {
    const expiresAt = new Date(data.subscription_conversion_token_expires_at);
    if (expiresAt < new Date()) {
      return null;
    }
  }

  return data as OrderRow;
}

// ============================================================================
// Function 4: markOrderConvertedToSubscription
// ============================================================================

/**
 * Mark an order as converted and link it to the created subscription.
 * Clears the conversion token (one-time use). Idempotent.
 */
export async function markOrderConvertedToSubscription(
  orderId: string,
  subscriptionId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      subscription_conversion_status: 'converted',
      converted_to_subscription_id: subscriptionId,
      subscription_conversion_token: null,
      subscription_conversion_token_expires_at: null,
    })
    .eq('id', orderId)
    .eq('subscription_conversion_status', 'pending')
    .select('id');

  if (error) {
    console.error('Error marking order as converted:', error);
    throw new Error('Failed to mark order as converted.');
  }

  if (!data || data.length === 0) {
    throw new Error('Order not found or already converted.');
  }
}

// ============================================================================
// Function 5: findOrCreateCustomerAccount
// ============================================================================

/**
 * Find an existing customer account by email, or create one.
 * Email ownership is proven by clicking the conversion link - no email
 * confirmation flow needed.
 *
 * Automatically links any guest orders (user_id IS NULL) with matching email.
 */
export async function findOrCreateCustomerAccount(
  email: string,
  fullName: string,
): Promise<FindOrCreateResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = fullName.trim();

  // 1. Check for existing user
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return { userId: existing.id, loginUrl: null, isNew: false };
  }

  // 2. Create new user
  const { data: userData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedName,
        created_by_conversion: true,
      },
    });

  // Race condition: user was created between the check and createUser
  if (createError) {
    if (createError.message?.includes('already registered')) {
      const retryUser = await getUserByEmail(normalizedEmail);
      if (retryUser) {
        return { userId: retryUser.id, loginUrl: null, isNew: false };
      }
    }
    console.error('[findOrCreateCustomerAccount] createUser failed:', createError);
    throw new Error('Failed to create customer account.');
  }

  // 3. Generate magic-link login URL (redirects to subscription page)
  let loginUrl: string | null = null;
  try {
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.warn(
        '[findOrCreateCustomerAccount] generateLink failed (user can use forgot-password):',
        linkError,
      );
    } else {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';
      const callbackUrl = new URL('/auth/callback', siteUrl);
      callbackUrl.searchParams.set(
        'token_hash',
        linkData.properties.hashed_token,
      );
      callbackUrl.searchParams.set('type', 'magiclink');
      callbackUrl.searchParams.set('next', '/account/subscriptions');
      loginUrl = callbackUrl.toString();
    }
  } catch (linkErr) {
    console.warn(
      '[findOrCreateCustomerAccount] generateLink threw:',
      linkErr,
    );
  }

  // 4. Auto-link guest orders with matching email
  await supabaseAdmin
    .from('orders')
    .update({ user_id: userData.user.id })
    .eq('customer_email', normalizedEmail)
    .is('user_id', null);

  return { userId: userData.user.id, loginUrl, isNew: true };
}
