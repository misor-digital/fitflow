/**
 * Order data access layer
 * Server-only functions for creating and querying orders
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  OrderRow,
  OrderInsert,
  OrderUpdate,
  OrderStatus,
  OrderStatusHistoryRow,
  OrderStatusHistoryInsert,
} from '@/lib/supabase/types';
import {
  validatePromoCode,
  incrementPromoCodeUsage,
  decrementPromoCodeUsage,
} from './promo';
import { calculatePrice } from './catalog';

// ============================================================================
// Write operations
// ============================================================================

/**
 * Create a new order and record the initial "pending" status history entry.
 * Returns the created order row (includes auto-generated `order_number`).
 */
export async function createOrder(data: OrderInsert): Promise<OrderRow> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order.');
  }

  // Record the initial status history entry
  const historyEntry: OrderStatusHistoryInsert = {
    order_id: order.id,
    from_status: null,
    to_status: 'pending',
  };

  const { error: historyError } = await supabaseAdmin
    .from('order_status_history')
    .insert(historyEntry);

  if (historyError) {
    console.error('Error creating initial status history:', historyError);
    // Non-fatal — the order was already created successfully
  }

  return order;
}

/**
 * Update an order's status and record the transition in status history.
 *
 * The DB auto-trigger has been removed so history entries are managed exclusively
 * here, giving full control over `changed_by` and `notes`.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedBy: string | null = null,
  notes: string | null = null,
): Promise<OrderRow> {
  // 1. Fetch current order to get current status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (fetchError || !current) {
    console.error('Error fetching order for status update:', fetchError);
    throw new Error('Order not found.');
  }

  const fromStatus = current.status as OrderStatus;

  // 2. Build update payload
  const updatePayload: OrderUpdate = { status: newStatus };

  // Set shipped_at when transitioning to 'shipped'
  if (newStatus === 'shipped') {
    updatePayload.shipped_at = new Date().toISOString();
  }

  // 3. Update the order status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Error updating order status:', updateError);
    throw new Error('Failed to update order status.');
  }

  // 3. Record status transition in history
  const historyEntry: OrderStatusHistoryInsert = {
    order_id: orderId,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: changedBy,
    notes,
  };

  const { error: historyError } = await supabaseAdmin
    .from('order_status_history')
    .insert(historyEntry);

  if (historyError) {
    console.error('Error recording status history:', historyError);
    // Non-fatal — the status was already updated successfully
  }

  return updated;
}

/**
 * Apply, replace, or remove a promo code on an existing order.
 *
 * Security: Only callable by admin (enforced at API layer).
 * Constraint: Only orders in 'pending' or 'confirmed' status can be modified.
 *
 * Flow:
 *   1. Fetch order, validate status
 *   2. Validate the new promo code (if applying)
 *   3. Recalculate price via authoritative calculatePrice()
 *   4. Update order row with new pricing
 *   5. Decrement old promo usage (if replacing/removing)
 *   6. Increment new promo usage (if applying/replacing)
 *   7. Record audit trail in order_price_history
 */
export async function applyPromoToOrder(
  orderId: string,
  promoCode: string | null,
  adminUserId: string,
  notes?: string,
): Promise<OrderRow> {
  // 1. Fetch the current order
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found.');
  }

  // 2. Only allow on mutable orders (not yet being processed/shipped/delivered)
  const MUTABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed'];
  if (!MUTABLE_STATUSES.includes(order.status)) {
    throw new Error(
      `Cannot modify pricing on an order with status "${order.status}". ` +
        `Only pending or confirmed orders can be updated.`,
    );
  }

  // 3. Normalize codes for comparison
  const oldCode = order.promo_code?.trim().toUpperCase() ?? null;
  const newCode = promoCode?.trim().toUpperCase() || null;

  // 4. Prevent no-op
  if (oldCode === newCode) {
    throw new Error('This promo code is already applied to the order.');
  }

  // 5. Validate the new promo code (skip for removal)
  if (newCode) {
    // Admin-applied: skip per-user limit (don't pass userId) but enforce
    // enabled, date range, and global usage cap
    const validatedPromo = await validatePromoCode(newCode);
    if (!validatedPromo) {
      throw new Error(
        `Promo code "${newCode}" is invalid, disabled, expired, or exhausted.`,
      );
    }
  }

  // 6. Recalculate price using the authoritative server-side price calculator
  const priceInfo = await calculatePrice(order.box_type, newCode ?? undefined);

  // 7. Determine change type for audit
  let changeType: string;
  if (oldCode && newCode) changeType = 'promo_replaced';
  else if (newCode) changeType = 'promo_applied';
  else changeType = 'promo_removed';

  // 8. Update order row with new pricing
  const updatePayload: OrderUpdate = {
    promo_code: newCode,
    discount_percent:
      priceInfo.discountPercent > 0 ? priceInfo.discountPercent : null,
    original_price_eur: priceInfo.originalPriceEur,
    final_price_eur: priceInfo.finalPriceEur,
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Error updating order pricing:', updateError);
    throw new Error('Failed to update order pricing.');
  }

  // 9. Decrement old promo usage (if replacing or removing an existing promo)
  if (oldCode) {
    try {
      await decrementPromoCodeUsage(
        oldCode,
        order.user_id ?? undefined,
        orderId,
      );
    } catch (err) {
      // Non-fatal: the order was already updated, log and continue
      console.error('Failed to decrement old promo usage:', err);
    }
  }

  // 10. Increment new promo usage (if applying or replacing)
  if (newCode) {
    await incrementPromoCodeUsage(
      newCode,
      order.user_id ?? undefined,
      orderId,
    );
  }

  // 11. Record audit trail
  const { error: historyError } = await supabaseAdmin
    .from('order_price_history')
    .insert({
      order_id: orderId,
      changed_by: adminUserId,
      change_type: changeType,
      prev_promo_code: order.promo_code,
      prev_discount_percent: order.discount_percent,
      prev_original_price_eur: order.original_price_eur,
      prev_final_price_eur: order.final_price_eur,
      new_promo_code: newCode,
      new_discount_percent:
        priceInfo.discountPercent > 0 ? priceInfo.discountPercent : null,
      new_original_price_eur: priceInfo.originalPriceEur,
      new_final_price_eur: priceInfo.finalPriceEur,
      notes: notes?.trim().slice(0, 1000) || null,
    });

  if (historyError) {
    console.error('Error recording price change history:', historyError);
    // Non-fatal — the order was already updated successfully
  }

  return updated;
}

// ============================================================================
// Read operations (cached per request via React.cache)
// ============================================================================

/**
 * Get an order by its UUID.
 */
export const getOrderById = cache(async (orderId: string): Promise<OrderRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching order:', error);
    return null;
  }

  return data;
});

/**
 * Get an order by its human-readable order number.
 */
export const getOrderByNumber = cache(
  async (orderNumber: string): Promise<OrderRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching order by number:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get an order by order number + email combo for guest order tracking.
 * Case-insensitive email comparison. NOT cached — security-sensitive operation.
 */
export async function getOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<OrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .ilike('customer_email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching order by number and email:', error);
    return null;
  }

  return data;
}

/**
 * Get all orders for a user, newest first.
 */
export const getOrdersByUser = cache(async (userId: string): Promise<OrderRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Failed to load orders.');
  }

  return data ?? [];
});

/**
 * Get status history for an order, chronological order.
 */
export const getOrderStatusHistory = cache(
  async (orderId: string): Promise<OrderStatusHistoryRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching order status history:', error);
      throw new Error('Failed to load order status history.');
    }

    return data ?? [];
  },
);

/**
 * Get total order count — for admin dashboard.
 */
export const getOrdersCount = cache(async (): Promise<number> => {
  const { count, error } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting orders:', error);
    throw new Error('Failed to count orders.');
  }

  return count ?? 0;
});

/**
 * Get paginated orders with optional filters — for admin order management.
 * `search` matches against order_number, customer_email, and customer_full_name.
 */
export const getOrdersPaginated = cache(
  async (
    page: number,
    perPage: number,
    filters?: { status?: OrderStatus; boxType?: string; search?: string },
  ): Promise<{ orders: OrderRow[]; total: number }> => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabaseAdmin.from('orders').select('*', { count: 'exact' });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.boxType) {
      query = query.eq('box_type', filters.boxType);
    }
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(
        `order_number.ilike.${search},customer_email.ilike.${search},customer_full_name.ilike.${search}`,
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated orders:', error);
      throw new Error('Failed to load orders.');
    }

    return {
      orders: data ?? [],
      total: count ?? 0,
    };
  },
);
