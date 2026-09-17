/**
 * Customer Data Access Layer
 *
 * Server-only functions for fetching customer user data with
 * aggregated stats (order count, subscription status).
 * Uses supabaseAdmin (service_role) - bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserEmailsByIds } from '@/lib/auth/get-users-by-ids';
import { TAG_CUSTOMERS } from './cache-tags';
import { withRetryOrFallback } from './retry';
import type { CustomerWithStats } from '@/lib/supabase/types';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Look up user IDs by partial email match via Supabase Auth admin API.
 * Returns an array of matching user IDs (may be empty).
 */
async function getUserIdsByEmail(emailQuery: string): Promise<string[]> {
  const ids: string[] = [];
  // Supabase admin.listUsers supports server-side filtering but not partial
  // match on email. We fetch pages and filter in-memory. For ≤1000 users
  // this is fast; the TODO at the top of this file covers the future fix.
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (!data?.users?.length) break;
    const q = emailQuery.toLowerCase();
    for (const u of data.users) {
      if (u.email?.toLowerCase().includes(q)) {
        ids.push(u.id);
      }
    }
    if (data.users.length < perPage) break;
    page++;
  }
  return ids;
}

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
      email?: string;
      phone?: string;
      isSubscriber?: boolean;
      hasActiveSubscription?: boolean;
      minOrders?: number;
    },
  ): Promise<{ customers: CustomerWithStats[]; total: number }> => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // If email filter is provided, resolve matching user IDs from auth first
    let emailMatchIds: string[] | null = null;
    if (filters?.email) {
      emailMatchIds = await getUserIdsByEmail(filters.email);
      if (emailMatchIds.length === 0) {
        return { customers: [], total: 0 };
      }
    }

    // Build query on user_profiles table
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('user_type', 'customer');

    // Apply filters
    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
    }
    if (emailMatchIds) {
      query = query.in('id', emailMatchIds);
    }
    if (filters?.phone) {
      query = query.ilike('phone', `%${filters.phone}%`);
    }
    if (filters?.isSubscriber !== undefined) {
      query = query.eq('is_subscriber', filters.isSubscriber);
    }

    // Subscription filter: resolve user IDs with/without active subscriptions
    if (filters?.hasActiveSubscription !== undefined) {
      const { data: subRows } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active');
      const activeSubIds = new Set((subRows ?? []).map(s => s.user_id));
      if (filters.hasActiveSubscription) {
        const ids = [...activeSubIds];
        if (ids.length === 0) return { customers: [], total: 0 };
        query = query.in('id', ids);
      } else {
        const ids = [...activeSubIds];
        if (ids.length > 0) {
          query = query.not('id', 'in', `(${ids.join(',')})`);
        }
      }
    }

    // Min orders filter: resolve user IDs with at least N orders
    if (filters?.minOrders) {
      const { data: orderRows } = await supabaseAdmin
        .from('orders')
        .select('user_id');
      const countMap = new Map<string, number>();
      for (const o of orderRows ?? []) {
        if (!o.user_id) continue;
        countMap.set(o.user_id, (countMap.get(o.user_id) ?? 0) + 1);
      }
      const qualifiedIds = [...countMap.entries()]
        .filter(([, cnt]) => cnt >= filters.minOrders!)
        .map(([id]) => id);
      if (qualifiedIds.length === 0) return { customers: [], total: 0 };
      query = query.in('id', qualifiedIds);
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

    // Process orders - aggregate count and last order date per user
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

    // Process subscriptions - build set of users with active subscription
    const activeSubUserIds = new Set(
      (activeSubsResult.data ?? []).map((s) => s.user_id),
    );

    // Fetch emails from Supabase Auth - single batch query via PostgREST
    const emailMap = await getUserEmailsByIds(userIds);

    // Assemble CustomerWithStats array
    const customers: CustomerWithStats[] = rows.map((profile) => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
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
  unstable_cache(
    async (): Promise<{
      total: number;
      subscribers: number;
      newThisMonth: number;
    }> => withRetryOrFallback(async () => {
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

      const firstError = [totalResult, subscriberResult, newResult].find((r) => r.error);
      if (firstError?.error) {
        console.error('Error fetching customer stats:', firstError.error);
        throw new Error('Failed to load customer stats.');
      }

      return {
        total: totalResult.count ?? 0,
        subscribers: subscriberResult.count ?? 0,
        newThisMonth: newResult.count ?? 0,
      };
    }, { total: 0, subscribers: 0, newThisMonth: 0 }),
    ['customers-stats'],
    { revalidate: 60, tags: [TAG_CUSTOMERS] },
  ),
);

/**
 * Staff member count - for admin dashboard.
 * Cached across requests for 60s (tag: customers).
 */
export const getStaffCount = cache(
  unstable_cache(
    async (): Promise<number> => withRetryOrFallback(async () => {
      const { count, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'staff');

      if (error) {
        console.error('Error counting staff:', error);
        throw new Error('Failed to load staff count.');
      }

      return count ?? 0;
    }, 0),
    ['staff-count'],
    { revalidate: 60, tags: [TAG_CUSTOMERS] },
  ),
);
