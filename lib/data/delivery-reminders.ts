/**
 * Delivery confirmation reminders data access layer
 * Server-only functions for recording and querying delivery confirmation reminders
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  DeliveryConfirmationReminderRow,
  OrderRow,
} from '@/lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

export interface OrderNeedingAction {
  order: OrderRow;
  reminderCount: number;            // 0, 1, 2, or 3
  lastReminderSentAt: string | null; // ISO timestamp of last reminder
}

// ============================================================================
// Write operations
// ============================================================================

/**
 * Insert a row into delivery_confirmation_reminders.
 * The UNIQUE(order_id, reminder_number) constraint ensures idempotency —
 * if the cron runs twice, the second insert will fail gracefully.
 * Catches the unique violation (code 23505) and returns the existing row.
 */
export async function recordReminderSent(
  orderId: string,
  reminderNumber: number,
): Promise<DeliveryConfirmationReminderRow> {
  const { data, error } = await supabaseAdmin
    .from('delivery_confirmation_reminders')
    .insert({ order_id: orderId, reminder_number: reminderNumber })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (already sent)
    if (error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('delivery_confirmation_reminders')
        .select('*')
        .eq('order_id', orderId)
        .eq('reminder_number', reminderNumber)
        .single();
      if (existing) return existing;
    }
    console.error('Error recording reminder:', error);
    throw new Error('Failed to record delivery confirmation reminder.');
  }

  return data;
}

// ============================================================================
// Read operations
// ============================================================================

/**
 * Fetch all reminders for a given order, ordered by reminder_number ASC.
 */
export async function getRemindersByOrder(
  orderId: string,
): Promise<DeliveryConfirmationReminderRow[]> {
  const { data, error } = await supabaseAdmin
    .from('delivery_confirmation_reminders')
    .select('*')
    .eq('order_id', orderId)
    .order('reminder_number', { ascending: true });

  if (error) {
    console.error('Error fetching reminders:', error);
    throw new Error('Failed to fetch delivery confirmation reminders.');
  }

  return data ?? [];
}

/**
 * Fetch the most recent reminder for an order (highest reminder_number).
 * Returns null if no reminders have been sent.
 */
export async function getLatestReminderByOrder(
  orderId: string,
): Promise<DeliveryConfirmationReminderRow | null> {
  const { data, error } = await supabaseAdmin
    .from('delivery_confirmation_reminders')
    .select('*')
    .eq('order_id', orderId)
    .order('reminder_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest reminder:', error);
    throw new Error('Failed to fetch latest delivery confirmation reminder.');
  }

  return data;
}

/**
 * Find orders in "shipped" status that need either a reminder email or
 * auto-confirmation. Uses the `get_orders_needing_delivery_action` RPC
 * function to perform the complex JOIN + filtering in Postgres, then
 * fetches full order rows for the matching IDs.
 */
export async function getOrdersNeedingDeliveryAction(
  delayDays: number,
): Promise<OrderNeedingAction[]> {
  // 1. Get order IDs + reminder state from RPC
  const { data: rpcResults, error: rpcError } = await supabaseAdmin
    .rpc('get_orders_needing_delivery_action', { delay_days: delayDays });

  if (rpcError) {
    console.error('Error fetching orders needing delivery action:', rpcError);
    throw new Error('Failed to fetch orders needing delivery confirmation.');
  }

  if (!rpcResults || rpcResults.length === 0) return [];

  // 2. Fetch full order rows
  const orderIds = rpcResults.map((r: { order_id: string }) => r.order_id);
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .in('id', orderIds);

  if (ordersError || !orders) {
    console.error('Error fetching order details:', ordersError);
    throw new Error('Failed to fetch order details.');
  }

  // 3. Combine RPC results with full order rows
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  return rpcResults
    .map((r: { order_id: string; reminder_count: number; last_sent_at: string | null }) => {
      const order = orderMap.get(r.order_id);
      if (!order) return null;
      return {
        order,
        reminderCount: r.reminder_count,
        lastReminderSentAt: r.last_sent_at,
      };
    })
    .filter(Boolean) as OrderNeedingAction[];
}

/**
 * Batch-fetch reminder counts for multiple orders.
 * Returns a map of orderId → { count, lastSentAt }.
 * Used by admin order listing.
 */
export async function getReminderCountsByOrders(
  orderIds: string[],
): Promise<Record<string, { count: number; lastSentAt: string | null }>> {
  if (orderIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from('delivery_confirmation_reminders')
    .select('order_id, reminder_number, sent_at')
    .in('order_id', orderIds)
    .order('reminder_number', { ascending: false });

  if (error) {
    console.error('Error fetching reminder counts:', error);
    return {};
  }

  const result: Record<string, { count: number; lastSentAt: string | null }> = {};

  for (const row of data ?? []) {
    const existing = result[row.order_id];
    if (!existing) {
      result[row.order_id] = {
        count: 1,
        lastSentAt: row.sent_at,
      };
    } else {
      existing.count++;
      // Keep the latest sent_at
      if (row.sent_at > (existing.lastSentAt ?? '')) {
        existing.lastSentAt = row.sent_at;
      }
    }
  }

  return result;
}
