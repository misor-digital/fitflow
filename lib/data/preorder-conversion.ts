/**
 * Preorder conversion data access layer
 * Server-only functions for the preorder-to-order conversion flow
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Preorder, PreorderConversionStatus } from '@/lib/supabase/types';

// ============================================================================
// Token-based lookup (NOT cached — security-sensitive)
// ============================================================================

/**
 * Look up a preorder by its one-time conversion token.
 * Returns null if:
 * - Token not found
 * - Preorder already converted or expired
 * - Token has expired (past `conversion_token_expires_at`)
 */
export async function getPreorderByToken(token: string): Promise<Preorder | null> {
  const { data, error } = await supabaseAdmin
    .from('preorders')
    .select('*')
    .eq('conversion_token', token)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preorder by token:', error);
    }
    return null;
  }

  // Must be in 'pending' conversion status
  if (data.conversion_status !== 'pending') {
    return null;
  }

  // Check token expiry (null = no expiry)
  if (data.conversion_token_expires_at) {
    const expiresAt = new Date(data.conversion_token_expires_at);
    if (expiresAt < new Date()) {
      return null; // Token expired
    }
  }

  return data as Preorder;
}

// ============================================================================
// Conversion operations
// ============================================================================

/**
 * Mark a preorder as converted and link it to the created order.
 * Clears the conversion token (one-time use).
 * Throws if preorder not found or already converted.
 */
export async function markPreorderConverted(
  preorderId: string,
  orderId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('preorders')
    .update({
      conversion_status: 'converted',
      converted_to_order_id: orderId,
      conversion_token: null,
      conversion_token_expires_at: null,
    })
    .eq('id', preorderId)
    .eq('conversion_status', 'pending')
    .select('id');

  if (error) {
    console.error('Error marking preorder as converted:', error);
    throw new Error('Failed to mark preorder as converted.');
  }

  if (!data || data.length === 0) {
    throw new Error('Preorder not found or already converted.');
  }
}

/**
 * Get the conversion status of a preorder by ID.
 */
export async function getPreorderConversionStatus(
  preorderId: string,
): Promise<PreorderConversionStatus | null> {
  const { data, error } = await supabaseAdmin
    .from('preorders')
    .select('conversion_status')
    .eq('id', preorderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching preorder conversion status:', error);
    return null;
  }

  return data.conversion_status as PreorderConversionStatus;
}

// ============================================================================
// User-scoped queries
// ============================================================================

/**
 * Get all preorders linked to a specific user, ordered by creation date (newest first).
 * Used on the customer account orders page.
 * Returns all preorders regardless of conversion status.
 */
export const getPreordersByUser = cache(
  async (userId: string): Promise<Preorder[]> => {
    const { data, error } = await supabaseAdmin
      .from('preorders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching preorders by user:', error);
      throw new Error('Failed to load user preorders.');
    }

    return (data ?? []) as Preorder[];
  },
);

// ============================================================================
// Admin views
// ============================================================================

/**
 * Get paginated preorders enriched with the converted order's order_number.
 * For the admin legacy view — LEFT JOINs with orders table.
 */
export async function getPreordersWithConversionInfo(
  page: number,
  perPage: number,
): Promise<{
  preorders: Array<Preorder & { converted_order_number?: string }>;
  total: number;
}> {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Use a foreign-key join: preorders.converted_to_order_id → orders.id
  const { data, error, count } = await supabaseAdmin
    .from('preorders')
    .select('*, orders:converted_to_order_id(order_number)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching preorders with conversion info:', error);
    throw new Error('Failed to load preorders.');
  }

  // Reshape the joined data into a flat structure
  const preorders = (data ?? []).map((row) => {
    const { orders, ...preorder } = row as Record<string, unknown>;
    const orderData = orders as { order_number: string } | null;
    return {
      ...preorder,
      converted_order_number: orderData?.order_number ?? undefined,
    } as Preorder & { converted_order_number?: string };
  });

  return {
    preorders,
    total: count ?? 0,
  };
}
