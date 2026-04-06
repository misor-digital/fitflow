/**
 * Subscription Data Access Layer
 *
 * Server-only functions for subscription CRUD, lifecycle transitions,
 * preference updates, and batch order generation for delivery cycles.
 * Uses supabaseAdmin (service_role) - bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TAG_SUBSCRIPTIONS } from './cache-tags';
import type {
  SubscriptionRow,
  SubscriptionInsert,
  SubscriptionUpdate,
  SubscriptionHistoryInsert,
  OrderInsert,
  OrderRow,
  ShippingAddressSnapshot,
  SubscriptionHistoryRow,
  AddressRow,
} from '@/lib/supabase/types';
import type { BatchGenerationResult, SubscriptionPreferencesUpdate, SubscriptionWithUserInfo } from '@/lib/subscription';
import { getUserEmailsByIds } from '@/lib/auth/get-users-by-ids';
import { shouldIncludeInCycle } from '@/lib/subscription';
import { sendDeliveryUpcomingEmail } from '@/lib/subscription/notifications';
import { createOrder } from './orders';
import { getAddressById } from './addresses';
import { calculatePrice } from './catalog';
import { getDeliveryCycleById, getDeliveryCycles } from './delivery-cycles';

// ============================================================================
// Helpers
// ============================================================================

/** Insert a subscription history entry. Non-fatal on error. */
async function insertHistory(entry: SubscriptionHistoryInsert): Promise<void> {
  const { error } = await supabaseAdmin
    .from('subscription_history')
    .insert(entry);

  if (error) {
    console.error('Error inserting subscription history:', error);
  }
}

/** Build a ShippingAddressSnapshot from an address row. */
function addressToSnapshot(address: AddressRow): ShippingAddressSnapshot {
  return {
    full_name: address.full_name,
    phone: address.phone,
    city: address.city ?? '',
    postal_code: address.postal_code ?? '',
    street_address: address.street_address ?? '',
    building_entrance: address.building_entrance,
    floor: address.floor,
    apartment: address.apartment,
    delivery_notes: address.delivery_notes,
    delivery_method: address.delivery_method,
    speedy_office_id: address.speedy_office_id ?? undefined,
    speedy_office_name: address.speedy_office_name ?? undefined,
    speedy_office_address: address.speedy_office_address ?? undefined,
  };
}

// ============================================================================
// Self-healing: resolve last_delivered_cycle_id from orders
// ============================================================================

/**
 * For subscriptions where last_delivered_cycle_id is null, look up
 * the most recent order's delivery_cycle_id as a fallback.
 * Also self-heals the subscription record in the background.
 */
export async function resolveLastDeliveredCycleId(
  subscriptionId: string,
): Promise<string | null> {
  // 1. Try orders that already have a delivery_cycle_id
  const { data } = await supabaseAdmin
    .from('orders')
    .select('delivery_cycle_id')
    .eq('subscription_id', subscriptionId)
    .not('delivery_cycle_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.delivery_cycle_id) {
    selfHealSubscription(subscriptionId, data.delivery_cycle_id);
    return data.delivery_cycle_id;
  }

  // 2. Fallback: orders without delivery_cycle_id (e.g. from preorder conversion).
  //    Match the order to the nearest past/current cycle by date.
  const { data: unlinkedOrder } = await supabaseAdmin
    .from('orders')
    .select('id, created_at')
    .eq('subscription_id', subscriptionId)
    .is('delivery_cycle_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!unlinkedOrder) return null;

  const orderDate = unlinkedOrder.created_at.split('T')[0];

  // Find the cycle whose delivery_date is closest to the order's created_at
  // (allow the cycle to be up to 30 days after the order — orders are pre-generated)
  const allCycles = await getDeliveryCycles();
  const sortedCycles = [...allCycles].sort(
    (a, b) => a.delivery_date.localeCompare(b.delivery_date),
  );

  let matchedCycle: typeof allCycles[number] | null = null;
  for (const cycle of sortedCycles) {
    const diffMs = new Date(cycle.delivery_date).getTime() - new Date(orderDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Cycle delivery within 30 days after order creation, or up to 7 days before
    if (diffDays >= -7 && diffDays <= 30) {
      matchedCycle = cycle;
      break;
    }
  }

  if (!matchedCycle) return null;

  // Self-heal: link the order to the cycle
  supabaseAdmin
    .from('orders')
    .update({ delivery_cycle_id: matchedCycle.id })
    .eq('id', unlinkedOrder.id)
    .is('delivery_cycle_id', null)
    .then(({ error }) => {
      if (error) console.error(`Self-heal order delivery_cycle_id for ${unlinkedOrder.id}:`, error);
    });

  selfHealSubscription(subscriptionId, matchedCycle.id);
  return matchedCycle.id;
}

/** Self-heal: update subscription.last_delivered_cycle_id in the background. */
function selfHealSubscription(subscriptionId: string, cycleId: string): void {
  supabaseAdmin
    .from('subscriptions')
    .update({ last_delivered_cycle_id: cycleId })
    .eq('id', subscriptionId)
    .is('last_delivered_cycle_id', null)
    .then(({ error }) => {
      if (error) console.error(`Self-heal last_delivered_cycle_id for ${subscriptionId}:`, error);
    });
}

/**
 * Enrich an array of subscriptions: resolve last_delivered_cycle_id
 * from actual orders for any subscription where it's null.
 */
export async function enrichSubscriptionsWithLastCycle<
  T extends { id: string; last_delivered_cycle_id: string | null },
>(subs: T[]): Promise<T[]> {
  const needsResolving = subs.filter((s) => s.last_delivered_cycle_id === null);
  if (needsResolving.length === 0) return subs;

  const resolved = await Promise.all(
    needsResolving.map(async (s) => ({
      id: s.id,
      cycleId: await resolveLastDeliveredCycleId(s.id),
    })),
  );

  const resolvedMap = new Map(resolved.map((r) => [r.id, r.cycleId]));

  return subs.map((s) => {
    if (s.last_delivered_cycle_id !== null) return s;
    const cycleId = resolvedMap.get(s.id);
    if (!cycleId) return s;
    return { ...s, last_delivered_cycle_id: cycleId };
  });
}

// ============================================================================
// Subscription CRUD
// ============================================================================

/**
 * Create a new subscription and record initial history.
 * Also sets user_profiles.is_subscriber = true.
 */
export async function createSubscription(
  data: SubscriptionInsert,
  performedBy: string,
  options?: { convertedFromOrderId?: string },
): Promise<SubscriptionRow> {
  const { data: subscription, error } = await supabaseAdmin
    .from('subscriptions')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription.');
  }

  // Record history
  const historyDetails: Record<string, unknown> = {
    box_type: data.box_type,
    frequency: data.frequency,
    base_price_eur: data.base_price_eur,
    current_price_eur: data.current_price_eur,
  };

  if (options?.convertedFromOrderId) {
    historyDetails.converted_from_order_id = options.convertedFromOrderId;
  }

  await insertHistory({
    subscription_id: subscription.id,
    action: 'created',
    details: historyDetails,
    performed_by: performedBy,
  });

  // Mark user as subscriber
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_subscriber: true })
    .eq('id', data.user_id);

  if (profileError) {
    console.error('Error updating user_profiles.is_subscriber:', profileError);
    // Non-fatal - subscription was already created
  }

  return subscription;
}

/**
 * Get a subscription by ID, optionally verifying ownership.
 */
export const getSubscriptionById = cache(
  async (id: string, userId?: string): Promise<SubscriptionRow | null> => {
    let query = supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get all subscriptions for a user, newest first.
 */
export const getSubscriptionsByUser = cache(
  async (userId: string): Promise<SubscriptionRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }

    return data ?? [];
  },
);

/**
 * Get all active subscriptions.
 */
export async function getActiveSubscriptions(): Promise<SubscriptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching active subscriptions:', error);
    throw new Error('Failed to load active subscriptions.');
  }

  return data ?? [];
}

/**
 * Get subscription counts grouped by status.
 * Uses parallel HEAD COUNT queries (no row data transferred).
 */
export const getSubscriptionsCount = cache(
  unstable_cache(
    async (): Promise<{ total: number; active: number; paused: number; cancelled: number }> => {
      const [totalResult, activeResult, pausedResult, cancelledResult] = await Promise.all([
        supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
        supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);

      const firstError = [totalResult, activeResult, pausedResult, cancelledResult].find((r) => r.error);
      if (firstError?.error) {
        console.error('Error counting subscriptions:', firstError.error);
        // Return zeros so the cache stores a fallback instead of retrying every request
        return { total: 0, active: 0, paused: 0, cancelled: 0 };
      }

      return {
        total: totalResult.count ?? 0,
        active: activeResult.count ?? 0,
        paused: pausedResult.count ?? 0,
        cancelled: cancelledResult.count ?? 0,
      };
    },
    ['subscriptions-count'],
    { revalidate: 60, tags: [TAG_SUBSCRIPTIONS] },
  ),
);

/**
 * Get Monthly Recurring Revenue (sum of current_price_eur for active subs).
 */
export const getSubscriptionMRR = cache(
  unstable_cache(
    async (): Promise<number> => {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('current_price_eur')
        .eq('status', 'active');

      if (error) {
        console.error('Error calculating MRR:', error);
        // Return 0 so the cache stores a fallback instead of retrying every request
        return 0;
      }

      if (!data || data.length === 0) return 0;

      return data.reduce((sum, row) => sum + Number(row.current_price_eur), 0);
    },
    ['subscription-mrr'],
    { revalidate: 60, tags: [TAG_SUBSCRIPTIONS] },
  ),
);

// ============================================================================
// Lifecycle Transitions
// ============================================================================

/**
 * Pause an active subscription.
 */
export async function pauseSubscription(
  id: string,
  performedBy: string,
): Promise<void> {
  // Validate current status
  const sub = await getSubscriptionById(id);
  if (!sub) throw new Error('Subscription not found.');
  if (sub.status !== 'active') {
    throw new Error('Only active subscriptions can be paused.');
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'paused' as const,
      paused_at: new Date().toISOString(),
    } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error pausing subscription:', error);
    throw new Error('Failed to pause subscription.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'paused',
    performed_by: performedBy,
  });
}

/**
 * Resume a paused subscription.
 *
 * Note: Resuming a subscription does NOT retroactively generate orders
 * for cycles that have already been processed. The subscriber will be
 * included starting from the next eligible cycle.
 */
export async function resumeSubscription(
  id: string,
  performedBy: string,
): Promise<void> {
  const sub = await getSubscriptionById(id);
  if (!sub) throw new Error('Subscription not found.');
  if (sub.status !== 'paused') {
    throw new Error('Only paused subscriptions can be resumed.');
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active' as const,
      paused_at: null,
    } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error resuming subscription:', error);
    throw new Error('Failed to resume subscription.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'resumed',
    performed_by: performedBy,
  });
}

/**
 * Cancel an active or paused subscription.
 * If the user has no remaining active subscriptions, clears is_subscriber flag.
 */
export async function cancelSubscription(
  id: string,
  performedBy: string,
  reason: string,
): Promise<void> {
  const sub = await getSubscriptionById(id);
  if (!sub) throw new Error('Subscription not found.');
  if (sub.status !== 'active' && sub.status !== 'paused') {
    throw new Error('Only active or paused subscriptions can be cancelled.');
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled' as const,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw new Error('Failed to cancel subscription.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'cancelled',
    details: { reason },
    performed_by: performedBy,
  });

  // Check if user has other active subscriptions
  const { data: remaining, error: remainingError } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', sub.user_id)
    .eq('status', 'active')
    .neq('id', id)
    .limit(1);

  if (remainingError) {
    console.error('Error checking remaining subscriptions:', remainingError);
    return; // Non-fatal
  }

  if (!remaining || remaining.length === 0) {
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_subscriber: false })
      .eq('id', sub.user_id);

    if (profileError) {
      console.error('Error clearing is_subscriber flag:', profileError);
    }
  }
}

/**
 * Expire a subscription (admin-only action).
 */
export async function expireSubscription(
  id: string,
  performedBy: string,
): Promise<void> {
  const sub = await getSubscriptionById(id);
  if (!sub) throw new Error('Subscription not found.');

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'expired' as const } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error expiring subscription:', error);
    throw new Error('Failed to expire subscription.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'expired',
    performed_by: performedBy,
  });
}

// ============================================================================
// Self-Service Updates
// ============================================================================

/**
 * Update subscription preferences with ownership verification and history logging.
 */
export async function updateSubscriptionPreferences(
  id: string,
  userId: string,
  prefs: SubscriptionPreferencesUpdate,
): Promise<void> {
  // Verify ownership
  const sub = await getSubscriptionById(id, userId);
  if (!sub) throw new Error('Subscription not found or access denied.');
  if (sub.status !== 'active' && sub.status !== 'paused') {
    throw new Error('Preferences can only be updated on active or paused subscriptions.');
  }

  // Capture old preferences for diff
  const oldPrefs: SubscriptionPreferencesUpdate = {
    wants_personalization: sub.wants_personalization,
    sports: sub.sports,
    sport_other: sub.sport_other,
    colors: sub.colors,
    flavors: sub.flavors,
    flavor_other: sub.flavor_other,
    dietary: sub.dietary,
    dietary_other: sub.dietary_other,
    size_upper: sub.size_upper,
    size_lower: sub.size_lower,
    additional_notes: sub.additional_notes,
  };

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      wants_personalization: prefs.wants_personalization,
      sports: prefs.sports,
      sport_other: prefs.sport_other,
      colors: prefs.colors,
      flavors: prefs.flavors,
      flavor_other: prefs.flavor_other,
      dietary: prefs.dietary,
      dietary_other: prefs.dietary_other,
      size_upper: prefs.size_upper,
      size_lower: prefs.size_lower,
      additional_notes: prefs.additional_notes,
    } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription preferences:', error);
    throw new Error('Failed to update preferences.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'preferences_updated',
    details: { before: oldPrefs, after: prefs },
    performed_by: userId,
  });
}

/**
 * Update the default delivery address for a subscription.
 * Verifies both subscription and address ownership.
 */
export async function updateSubscriptionAddress(
  id: string,
  userId: string,
  addressId: string,
): Promise<void> {
  // Verify subscription ownership
  const sub = await getSubscriptionById(id, userId);
  if (!sub) throw new Error('Subscription not found or access denied.');

  // Verify address ownership
  const address = await getAddressById(addressId, userId);
  if (!address) throw new Error('Address not found or does not belong to this user.');

  const oldAddressId = sub.default_address_id;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ default_address_id: addressId } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription address:', error);
    throw new Error('Failed to update delivery address.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'address_changed',
    details: { old_address_id: oldAddressId, new_address_id: addressId },
    performed_by: userId,
  });
}

/**
 * Change subscription frequency. Only active subscriptions can change frequency.
 */
export async function updateSubscriptionFrequency(
  id: string,
  userId: string,
  newFrequency: 'monthly' | 'seasonal',
): Promise<void> {
  const sub = await getSubscriptionById(id, userId);
  if (!sub) throw new Error('Subscription not found or access denied.');
  if (sub.status !== 'active') {
    throw new Error('Frequency can only be changed on active subscriptions.');
  }

  const oldFrequency = sub.frequency;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ frequency: newFrequency } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription frequency:', error);
    throw new Error('Failed to update frequency.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'frequency_changed',
    details: { old: oldFrequency, new: newFrequency },
    performed_by: userId,
  });
}

/** Admin: change subscription frequency. Only active subscriptions allowed. */
export async function adminUpdateSubscriptionFrequency(
  id: string,
  performedBy: string,
  newFrequency: 'monthly' | 'seasonal',
): Promise<void> {
  const sub = await getSubscriptionById(id);
  if (!sub) throw new Error('Subscription not found.');
  if (sub.status !== 'active') {
    throw new Error('Frequency can only be changed on active subscriptions.');
  }
  if (sub.frequency === newFrequency) return;

  const oldFrequency = sub.frequency;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ frequency: newFrequency } satisfies SubscriptionUpdate)
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription frequency (admin):', error);
    throw new Error('Failed to update frequency.');
  }

  await insertHistory({
    subscription_id: id,
    action: 'frequency_changed',
    details: { old: oldFrequency, new: newFrequency, changed_by: 'admin' },
    performed_by: performedBy,
  });
}

// ============================================================================
// Batch Order Generation
// ============================================================================

/**
 * Generate orders for all eligible subscriptions in a delivery cycle.
 *
 * This is the core batch operation. It:
 * - Loads the cycle and verifies its status
 * - Evaluates each active subscription for inclusion (monthly vs seasonal logic)
 * - Checks idempotency (skips if order already exists for sub + cycle)
 * - Creates orders with full personalization + pricing snapshot
 * - Updates last_delivered_cycle_id on each generated order
 * - Continues on per-subscriber errors (partial success)
 */
export async function generateOrdersForCycle(
  cycleId: string,
  performedBy: string,
): Promise<BatchGenerationResult> {
  // a. Load and verify cycle
  const cycle = await getDeliveryCycleById(cycleId);
  if (!cycle) throw new Error('Delivery cycle not found.');
  if (cycle.status !== 'upcoming' && cycle.status !== 'delivered') {
    throw new Error('Orders can only be generated for upcoming or delivered cycles.');
  }

  const result: BatchGenerationResult = {
    cycleId,
    cycleDate: cycle.delivery_date,
    generated: 0,
    skipped: 0,
    excluded: 0,
    errors: 0,
    errorDetails: [],
  };

  // b. Load all active subscriptions
  const activeSubs = await getActiveSubscriptions();
  if (activeSubs.length === 0) return result;

  // c. Load all cycles sorted by date for seasonal calculation
  const allCycles = await getDeliveryCycles();
  const allCyclesSorted = [...allCycles].sort(
    (a, b) => a.delivery_date.localeCompare(b.delivery_date),
  );

  // d+e+f. Process each subscription
  for (const sub of activeSubs) {
    // d. Check inclusion
    if (!shouldIncludeInCycle(sub, cycle, allCyclesSorted)) {
      result.excluded++;
      continue;
    }

    // e. Idempotency check
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('delivery_cycle_id', cycleId)
      .limit(1)
      .maybeSingle();

    if (existingOrder) {
      result.skipped++;
      continue;
    }

    // f. Build and create order (wrapped in try/catch)
    try {
      // Load default address
      if (!sub.default_address_id) {
        throw new Error('No default address configured');
      }

      const address = await getAddressById(sub.default_address_id, sub.user_id);
      if (!address) {
        throw new Error('Default address not found or ownership mismatch');
      }

      const snapshot = addressToSnapshot(address);

      // Determine if promo should apply this cycle
      const promoExhausted = sub.promo_code !== null
        && sub.promo_max_cycles !== null
        && (sub.promo_cycles_used ?? 0) >= sub.promo_max_cycles;

      const effectivePromoCode = promoExhausted ? null : sub.promo_code;
      const effectiveDiscountPercent = promoExhausted ? null : sub.discount_percent;

      // Recalculate price server-side
      const pricing = await calculatePrice(sub.box_type, effectivePromoCode);

      // Load user profile for contact info
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name, phone')
        .eq('id', sub.user_id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      // Load user email from auth.users
      const { data: authUser, error: authError } = await supabaseAdmin
        .auth.admin.getUserById(sub.user_id);

      if (authError || !authUser?.user) {
        throw new Error('Auth user not found');
      }

      const orderData: OrderInsert = {
        user_id: sub.user_id,
        customer_email: authUser.user.email ?? '',
        customer_full_name: profile.full_name,
        customer_phone: profile.phone ?? address.phone,
        shipping_address: snapshot,
        address_id: sub.default_address_id,
        box_type: sub.box_type,
        wants_personalization: sub.wants_personalization,
        sports: sub.sports,
        sport_other: sub.sport_other,
        colors: sub.colors,
        flavors: sub.flavors,
        flavor_other: sub.flavor_other,
        dietary: sub.dietary,
        dietary_other: sub.dietary_other,
        size_upper: sub.size_upper,
        size_lower: sub.size_lower,
        additional_notes: sub.additional_notes,
        promo_code: effectivePromoCode,
        discount_percent: effectiveDiscountPercent,
        original_price_eur: pricing.originalPriceEur,
        final_price_eur: pricing.finalPriceEur,
        subscription_id: sub.id,
        delivery_cycle_id: cycleId,
        order_type: 'subscription',
        delivery_method: address.delivery_method ?? 'address',
      };

      const order = await createOrder(orderData);

      // Update last_delivered_cycle_id
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ last_delivered_cycle_id: cycleId } satisfies SubscriptionUpdate)
        .eq('id', sub.id);

      if (updateError) {
        console.error(`Error updating last_delivered_cycle_id for sub ${sub.id}:`, updateError);
      }

      // Update promo cycle tracking
      if (effectivePromoCode && sub.promo_code) {
        const newCyclesUsed = (sub.promo_cycles_used ?? 0) + 1;
        const shouldClearPromo = sub.promo_max_cycles !== null && newCyclesUsed >= sub.promo_max_cycles;

        if (shouldClearPromo) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              promo_code: null,
              discount_percent: null,
              current_price_eur: pricing.originalPriceEur,
              promo_cycles_used: newCyclesUsed,
            } satisfies SubscriptionUpdate)
            .eq('id', sub.id);
        } else {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              promo_cycles_used: newCyclesUsed,
            } satisfies SubscriptionUpdate)
            .eq('id', sub.id);
        }
      }

      // Record subscription history
      await insertHistory({
        subscription_id: sub.id,
        action: 'order_generated',
        details: { cycle_id: cycleId, order_id: order.id },
        performed_by: performedBy,
      });

      // Fire-and-forget delivery upcoming email
      sendDeliveryUpcomingEmail(
        authUser.user.email ?? '',
        sub,
        cycle.delivery_date,
        order.id,
        order.order_number,
      ).catch(() => {});

      result.generated++;
    } catch (err) {
      result.errors++;
      result.errorDetails.push({
        subscriptionId: sub.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

// ============================================================================
// Subscription History
// ============================================================================

/**
 * Get full history for a subscription, newest first.
 */
export const getSubscriptionHistory = cache(
  async (subscriptionId: string): Promise<SubscriptionHistoryRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('subscription_history')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscription history:', error);
      throw new Error('Failed to load subscription history.');
    }

    return data ?? [];
  },
);

// ============================================================================
// Admin Queries
// ============================================================================

/**
 * Get orders linked to a subscription, newest first.
 */
export const getOrdersBySubscription = cache(
  async (subscriptionId: string): Promise<OrderRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders by subscription:', error);
      throw new Error('Failed to load subscription orders.');
    }

    return data ?? [];
  },
);

/**
 * Get paginated subscriptions with optional filters.
 * Returns SubscriptionWithUserInfo (includes user_email + user_full_name).
 * Supports filtering by status, boxType, frequency, and search (user name/email).
 */
export const getSubscriptionsPaginated = cache(
  async (
    page: number,
    perPage: number,
    filters?: {
      status?: string;
      boxType?: string;
      frequency?: string;
      search?: string;
    },
  ): Promise<{ subscriptions: SubscriptionWithUserInfo[]; total: number }> => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // If search is provided, match user name OR subscription_number
    let userIds: string[] | undefined;
    let subscriptionNumberSearch: string | undefined;
    if (filters?.search) {
      const search = `%${filters.search}%`;

      // Search in user_profiles (full_name)
      const { data: profileMatches } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .ilike('full_name', search);

      const profileIds = (profileMatches ?? []).map((p) => p.id);
      userIds = profileIds;
      subscriptionNumberSearch = search;
    }

    let query = supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status as SubscriptionRow['status']);
    }
    if (filters?.boxType) {
      query = query.eq('box_type', filters.boxType);
    }
    if (filters?.frequency) {
      query = query.eq('frequency', filters.frequency);
    }
    if (userIds !== undefined || subscriptionNumberSearch) {
      const orParts: string[] = [];
      if (userIds && userIds.length > 0) {
        orParts.push(`user_id.in.(${userIds.join(',')})`);
      }
      if (subscriptionNumberSearch) {
        orParts.push(`subscription_number.ilike.${subscriptionNumberSearch}`);
      }
      if (orParts.length > 0) {
        query = query.or(orParts.join(','));
      } else {
        return { subscriptions: [], total: 0 };
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated subscriptions:', error);
      throw new Error('Failed to load subscriptions.');
    }

    const rows = data ?? [];

    // Enrich with user info (email + name)
    if (rows.length === 0) {
      return { subscriptions: [], total: count ?? 0 };
    }

    const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))];

    // Fetch profiles
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name')
      .in('id', uniqueUserIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name]),
    );

    // Fetch emails via auth - single batch query via PostgREST
    const emailMap = await getUserEmailsByIds(uniqueUserIds);

    const subscriptions: SubscriptionWithUserInfo[] = rows.map((row) => ({
      ...row,
      user_full_name: profileMap.get(row.user_id) ?? 'Неизвестен',
      user_email: emailMap.get(row.user_id) ?? '',
    }));

    return {
      subscriptions,
      total: count ?? 0,
    };
  },
);

/**
 * Get all subscriptions that would be included in a given cycle.
 * Useful for preview before batch generation.
 */
export async function getSubscriptionsForCycle(
  cycleId: string,
): Promise<SubscriptionRow[]> {
  const cycle = await getDeliveryCycleById(cycleId);
  if (!cycle) throw new Error('Delivery cycle not found.');

  const activeSubs = await getActiveSubscriptions();
  const allCycles = await getDeliveryCycles();
  const allCyclesSorted = [...allCycles].sort(
    (a, b) => a.delivery_date.localeCompare(b.delivery_date),
  );

  return activeSubs.filter((sub) =>
    shouldIncludeInCycle(sub, cycle, allCyclesSorted),
  );
}
