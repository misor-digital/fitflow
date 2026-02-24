/**
 * Subscription Data Access Layer
 *
 * Server-only functions for subscription CRUD, lifecycle transitions,
 * preference updates, and batch order generation for delivery cycles.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  SubscriptionRow,
  SubscriptionInsert,
  SubscriptionUpdate,
  SubscriptionHistoryInsert,
  OrderInsert,
  OrderRow,
  ShippingAddressSnapshot,
  SubscriptionHistoryRow,
} from '@/lib/supabase/types';
import type { BatchGenerationResult, SubscriptionPreferencesUpdate, SubscriptionWithUserInfo } from '@/lib/subscription';
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
function addressToSnapshot(address: {
  full_name: string;
  phone: string | null;
  city: string;
  postal_code: string;
  street_address: string;
  building_entrance: string | null;
  floor: string | null;
  apartment: string | null;
  delivery_notes: string | null;
}): ShippingAddressSnapshot {
  return {
    full_name: address.full_name,
    phone: address.phone,
    city: address.city,
    postal_code: address.postal_code,
    street_address: address.street_address,
    building_entrance: address.building_entrance,
    floor: address.floor,
    apartment: address.apartment,
    delivery_notes: address.delivery_notes,
  };
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
  await insertHistory({
    subscription_id: subscription.id,
    action: 'created',
    performed_by: performedBy,
  });

  // Mark user as subscriber
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_subscriber: true })
    .eq('id', data.user_id);

  if (profileError) {
    console.error('Error updating user_profiles.is_subscriber:', profileError);
    // Non-fatal — subscription was already created
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
      throw new Error('Failed to load subscriptions.');
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
 */
export const getSubscriptionsCount = cache(
  async (): Promise<{ total: number; active: number; paused: number; cancelled: number }> => {
    // Supabase JS client doesn't support FILTER(WHERE) in COUNT,
    // so we run a lightweight select and count client-side.
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status');

    if (error) {
      console.error('Error counting subscriptions:', error);
      throw new Error('Failed to count subscriptions.');
    }

    const rows = data ?? [];
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      paused: rows.filter((r) => r.status === 'paused').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
    };
  },
);

/**
 * Get Monthly Recurring Revenue (sum of current_price_eur for active subs).
 */
export const getSubscriptionMRR = cache(async (): Promise<number> => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('current_price_eur')
    .eq('status', 'active');

  if (error) {
    console.error('Error calculating MRR:', error);
    throw new Error('Failed to calculate MRR.');
  }

  if (!data || data.length === 0) return 0;

  return data.reduce((sum, row) => sum + Number(row.current_price_eur), 0);
});

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

      // Recalculate price server-side
      const pricing = await calculatePrice(sub.box_type, sub.promo_code);

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
        promo_code: sub.promo_code,
        discount_percent: sub.discount_percent,
        original_price_eur: pricing.originalPriceEur,
        final_price_eur: pricing.finalPriceEur,
        subscription_id: sub.id,
        delivery_cycle_id: cycleId,
        order_type: 'subscription',
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

    // If search is provided, we need to find matching user IDs first
    let userIds: string[] | undefined;
    if (filters?.search) {
      const search = `%${filters.search}%`;

      // Search in user_profiles (full_name)
      const { data: profileMatches } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .ilike('full_name', search);

      const profileIds = (profileMatches ?? []).map((p) => p.id);
      userIds = profileIds;

      // If no matching users found, return empty
      if (userIds.length === 0) {
        return { subscriptions: [], total: 0 };
      }
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
    if (userIds) {
      query = query.in('user_id', userIds);
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

    // Fetch emails via auth admin API
    const emailMap = new Map<string, string>();
    for (const uid of uniqueUserIds) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (authUser?.user?.email) {
          emailMap.set(uid, authUser.user.email);
        }
      } catch {
        // Non-fatal — email will be empty
      }
    }

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
