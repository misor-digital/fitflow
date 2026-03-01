/**
 * Customer Data Access Layer
 *
 * Server-only functions for fetching customer user data with
 * aggregated stats (order count, subscription status).
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CustomerWithStats } from '@/lib/supabase/types';

// ============================================================================
// Read operations
// ============================================================================

/**
 * Fetch a paginated list of customers with aggregated stats.
 *
 * - Order count & last order date are aggregated from the `orders` table.
 * - Active subscription status is derived from the `subscriptions` table.
 * - Emails are fetched from Supabase Auth (not stored in user_profiles).
 *
 * // TODO: When user base grows beyond ~1000, denormalize email into
 * // user_profiles or use a Postgres function to avoid N+1 auth lookups.
 */
export const getCustomersPaginated = cache(
  async (
    page: number,
    perPage: number,
    filters?: {
      search?: string;
      isSubscriber?: boolean;
    },
  ): Promise<{ customers: CustomerWithStats[]; total: number }> => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Build query on user_profiles table
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('user_type', 'customer');

    // Apply filters
    if (filters?.search) {
      query = query.ilike('full_name', `%${filters.search}%`);
    }
    if (filters?.isSubscriber !== undefined) {
      query = query.eq('is_subscriber', filters.isSubscriber);
    }

    // Execute paginated query
    const {
      data: profiles,
      error,
      count,
    } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated customers:', error);
      throw new Error('Failed to load customers.');
    }

    const rows = profiles ?? [];
    if (rows.length === 0) {
      return { customers: [], total: count ?? 0 };
    }

    // Collect unique user IDs for aggregate queries
    const userIds = rows.map((r) => r.id);

    // Fetch order stats and active subscriptions in parallel
    const [orderStatsResult, activeSubsResult] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active'),
    ]);

    // Process orders — aggregate count and last order date per user
    const orderRows = orderStatsResult.data ?? [];
    const orderCountMap = new Map<string, number>();
    const lastOrderMap = new Map<string, string>();
    for (const order of orderRows) {
      if (!order.user_id) continue;
      orderCountMap.set(
        order.user_id,
        (orderCountMap.get(order.user_id) ?? 0) + 1,
      );
      if (!lastOrderMap.has(order.user_id)) {
        lastOrderMap.set(order.user_id, order.created_at);
      }
    }

    // Process subscriptions — build set of users with active subscription
    const activeSubUserIds = new Set(
      (activeSubsResult.data ?? []).map((s) => s.user_id),
    );

    // Fetch emails from Supabase Auth (parallel per-user)
    const emailMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const { data: authUser } =
            await supabaseAdmin.auth.admin.getUserById(uid);
          if (authUser?.user?.email) {
            emailMap.set(uid, authUser.user.email);
          }
        } catch {
          // Non-fatal — email will show as empty
        }
      }),
    );

    // Assemble CustomerWithStats array
    const customers: CustomerWithStats[] = rows.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: emailMap.get(profile.id) ?? '',
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      is_subscriber: profile.is_subscriber,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      order_count: orderCountMap.get(profile.id) ?? 0,
      has_active_subscription: activeSubUserIds.has(profile.id),
      last_order_date: lastOrderMap.get(profile.id) ?? null,
    }));

    return { customers, total: count ?? 0 };
  },
);

/**
 * Fetch aggregate stats for the customer listing header cards.
 *
 * Returns total customers, subscriber count, and new-this-month count.
 */
export const getCustomersStats = cache(
  async (): Promise<{
    total: number;
    subscribers: number;
    newThisMonth: number;
  }> => {
    const now = new Date();
    const firstOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    const [totalResult, subscriberResult, newResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'customer'),
      supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'customer')
        .eq('is_subscriber', true),
      supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'customer')
        .gte('created_at', firstOfMonth),
    ]);

    return {
      total: totalResult.count ?? 0,
      subscribers: subscriberResult.count ?? 0,
      newThisMonth: newResult.count ?? 0,
    };
  },
);
