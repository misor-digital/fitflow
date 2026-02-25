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
  OrderStatus,
  OrderStatusHistoryRow,
  OrderStatusHistoryInsert,
} from '@/lib/supabase/types';

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

  // 2. Update the order status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
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
