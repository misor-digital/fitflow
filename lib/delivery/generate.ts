/**
 * Shared Generation Logic
 *
 * Core functions for batch order generation, used by both:
 * - The admin API route (POST /api/admin/delivery/generate)
 * - The cron endpoint (GET /api/cron/generate-orders)
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getEarliestEligibleCycle,
  generateOrdersForCycle,
  getSubscriptionById,
  getAddressById,
  calculatePrice,
  createOrder,
  getDeliveryCycleById,
} from '@/lib/data';
import type { BatchGenerationResult } from '@/lib/subscription';

/** Extended result that allows null cycleId/cycleDate when no eligible cycle found */
export interface GenerationResult {
  cycleId: string | null;
  cycleDate: string | null;
  generated: number;
  skipped: number;
  excluded: number;
  errors: number;
  errorDetails: Array<{ subscriptionId: string; error: string }>;
  message?: string;
}

/**
 * Find the earliest upcoming cycle eligible for generation and generate orders.
 * Used by both the cron job and admin manual trigger (auto-detect mode).
 */
export async function generateOrdersForActiveCycle(
  performedBy: string,
): Promise<GenerationResult> {
  // Auto-detect: find earliest upcoming cycle where delivery_date <= today
  const cycle = await getEarliestEligibleCycle();

  if (!cycle) {
    return {
      cycleId: null,
      cycleDate: null,
      generated: 0,
      skipped: 0,
      excluded: 0,
      errors: 0,
      errorDetails: [],
      message: 'Няма предстоящ цикъл за генериране.',
    };
  }

  // Generate orders for the cycle
  const result = await generateOrdersForCycle(cycle.id, performedBy);

  return {
    ...result,
    cycleId: cycle.id,
    cycleDate: cycle.delivery_date,
  };
}

/**
 * Generate orders for a specific cycle by ID.
 * Used by admin when explicitly selecting a cycle.
 */
export async function generateOrdersForSpecificCycle(
  cycleId: string,
  performedBy: string,
): Promise<GenerationResult> {
  // Validate cycle exists
  const { data: cycle } = await supabaseAdmin
    .from('delivery_cycles')
    .select('id, delivery_date')
    .eq('id', cycleId)
    .single();

  if (!cycle) {
    throw new Error('Цикълът не е намерен.');
  }

  const result = await generateOrdersForCycle(cycleId, performedBy);

  return {
    ...result,
    cycleId: cycle.id,
    cycleDate: cycle.delivery_date,
  };
}

/**
 * Generate a single order for a specific subscription and cycle.
 * Used for late-addition subscriptions joining a cycle that's already processing.
 */
export async function generateSingleOrderForSubscription(
  subscriptionId: string,
  cycleId: string,
  performedBy: string,
): Promise<void> {
  // 1. Load subscription
  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) throw new Error('Subscription not found.');

  // 2. Load cycle
  const cycle = await getDeliveryCycleById(cycleId);
  if (!cycle) throw new Error('Delivery cycle not found.');

  // 3. Idempotency — check if order already exists for this sub + cycle
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('delivery_cycle_id', cycleId)
    .limit(1)
    .maybeSingle();

  if (existingOrder) return; // Already exists

  // 4. Load address
  if (!sub.default_address_id) {
    throw new Error('No default address configured on subscription.');
  }

  const address = await getAddressById(sub.default_address_id, sub.user_id);
  if (!address) throw new Error('Default address not found.');

  // 5. Calculate price
  const pricing = await calculatePrice(sub.box_type, sub.promo_code);

  // 6. Load user info
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('full_name, phone')
    .eq('id', sub.user_id)
    .single();

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);

  if (!profile || !authUser?.user) throw new Error('User info not found.');

  // 7. Create order
  await createOrder({
    user_id: sub.user_id,
    customer_email: authUser.user.email ?? '',
    customer_full_name: profile.full_name,
    customer_phone: profile.phone ?? address.phone,
    shipping_address: {
      full_name: address.full_name,
      phone: address.phone,
      city: address.city,
      postal_code: address.postal_code,
      street_address: address.street_address,
      building_entrance: address.building_entrance,
      floor: address.floor,
      apartment: address.apartment,
      delivery_notes: address.delivery_notes,
    },
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
  });

  // 8. Update last_delivered_cycle_id
  await supabaseAdmin
    .from('subscriptions')
    .update({ last_delivered_cycle_id: cycleId })
    .eq('id', sub.id);

  // 9. Record history
  await supabaseAdmin.from('subscription_history').insert({
    subscription_id: sub.id,
    action: 'order_generated',
    details: { cycle_id: cycleId, late_addition: true },
    performed_by: performedBy,
  });
}
