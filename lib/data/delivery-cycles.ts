/**
 * Delivery Cycles Data Access Layer
 *
 * Server-only CRUD functions for delivery_cycles and delivery_cycle_items.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions are wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  DeliveryCycleRow,
  DeliveryCycleInsert,
  DeliveryCycleUpdate,
  DeliveryCycleItemRow,
  DeliveryCycleItemInsert,
  DeliveryCycleItemUpdate,
} from '@/lib/supabase/types';

// ============================================================================
// Delivery-related site_config keys
// ============================================================================

const DELIVERY_CONFIG_KEYS = [
  'SUBSCRIPTION_DELIVERY_DAY',
  'FIRST_DELIVERY_DATE',
  'SUBSCRIPTION_ENABLED',
  'REVEALED_BOX_ENABLED',
] as const;

type DeliveryConfigKey = (typeof DELIVERY_CONFIG_KEYS)[number];

// ============================================================================
// Delivery Cycle — Read (cached)
// ============================================================================

/**
 * Get all delivery cycles, newest first.
 */
export const getDeliveryCycles = cache(
  async (): Promise<DeliveryCycleRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycles')
      .select('*')
      .order('delivery_date', { ascending: false });

    if (error) {
      console.error('Error fetching delivery cycles:', error);
      throw new Error('Failed to load delivery cycles.');
    }

    return data ?? [];
  },
);

/**
 * Get a single delivery cycle by ID.
 */
export const getDeliveryCycleById = cache(
  async (id: string): Promise<DeliveryCycleRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching delivery cycle:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get the next upcoming cycle (status = 'upcoming', delivery_date in the future).
 */
export const getUpcomingCycle = cache(
  async (): Promise<DeliveryCycleRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycles')
      .select('*')
      .eq('status', 'upcoming')
      .gte('delivery_date', new Date().toISOString().split('T')[0])
      .order('delivery_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching upcoming cycle:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get the earliest upcoming cycle whose delivery_date <= today.
 * This is the cycle eligible for automatic order generation by the cron job.
 */
export async function getEarliestEligibleCycle(): Promise<DeliveryCycleRow | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('delivery_cycles')
    .select('*')
    .eq('status', 'upcoming')
    .lte('delivery_date', today)
    .order('delivery_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching earliest eligible cycle:', error);
    return null;
  }

  return data;
}

/**
 * Get the most recently revealed cycle.
 */
export const getCurrentRevealedCycle = cache(
  async (): Promise<DeliveryCycleRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycles')
      .select('*')
      .eq('is_revealed', true)
      .order('delivery_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching revealed cycle:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get all cycles with status = 'delivered', newest first.
 */
export const getDeliveredCycles = cache(
  async (): Promise<DeliveryCycleRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycles')
      .select('*')
      .eq('status', 'delivered')
      .order('delivery_date', { ascending: false });

    if (error) {
      console.error('Error fetching delivered cycles:', error);
      throw new Error('Failed to load delivered cycles.');
    }

    return data ?? [];
  },
);

// ============================================================================
// Delivery Cycle — Write
// ============================================================================

/**
 * Create a new delivery cycle.
 * Throws if delivery_date already exists (unique constraint).
 */
export async function createDeliveryCycle(
  data: DeliveryCycleInsert,
): Promise<DeliveryCycleRow> {
  const { data: cycle, error } = await supabaseAdmin
    .from('delivery_cycles')
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `A delivery cycle already exists for date ${data.delivery_date}.`,
      );
    }
    console.error('Error creating delivery cycle:', error);
    throw new Error('Failed to create delivery cycle.');
  }

  return cycle;
}

/**
 * Update a delivery cycle.
 */
export async function updateDeliveryCycle(
  id: string,
  data: DeliveryCycleUpdate,
): Promise<DeliveryCycleRow> {
  const { data: cycle, error } = await supabaseAdmin
    .from('delivery_cycles')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating delivery cycle:', error);
    throw new Error('Failed to update delivery cycle.');
  }

  return cycle;
}

/**
 * Delete a delivery cycle.
 * Only allowed if status is 'upcoming' and no orders reference it.
 */
export async function deleteDeliveryCycle(id: string): Promise<void> {
  // 1. Verify cycle exists and is upcoming
  const cycle = await getDeliveryCycleById(id);
  if (!cycle) {
    throw new Error('Delivery cycle not found.');
  }
  if (cycle.status !== 'upcoming') {
    throw new Error(
      'Only upcoming cycles can be deleted. Archive delivered cycles instead.',
    );
  }

  // 2. Check for referencing orders
  const { count, error: countError } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_cycle_id', id);

  if (countError) {
    console.error('Error checking orders for cycle:', countError);
    throw new Error('Failed to verify cycle can be deleted.');
  }

  if (count && count > 0) {
    throw new Error(
      `Cannot delete cycle: ${count} order(s) are assigned to it. Reassign or cancel them first.`,
    );
  }

  // 3. Delete
  const { error } = await supabaseAdmin
    .from('delivery_cycles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting delivery cycle:', error);
    throw new Error('Failed to delete delivery cycle.');
  }
}

/**
 * Mark a cycle as delivered. Only works on 'upcoming' cycles.
 */
export async function markCycleDelivered(
  id: string,
): Promise<DeliveryCycleRow> {
  const { data: cycle, error } = await supabaseAdmin
    .from('delivery_cycles')
    .update({ status: 'delivered' as const })
    .eq('id', id)
    .eq('status', 'upcoming')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(
        'Cycle not found or is not in "upcoming" status. Only upcoming cycles can be marked as delivered.',
      );
    }
    console.error('Error marking cycle delivered:', error);
    throw new Error('Failed to mark cycle as delivered.');
  }

  return cycle;
}

/**
 * Reveal a cycle's contents to subscribers.
 * Sets is_revealed = true, revealed_at = now, status = 'delivered'.
 * Also activates REVEALED_BOX_ENABLED in site_config (first reveal enables the feature permanently).
 * Throws if the cycle has no items.
 */
export async function revealCycle(id: string): Promise<DeliveryCycleRow> {
  // 1. Verify cycle has items
  const items = await getCycleItems(id);
  if (items.length === 0) {
    throw new Error(
      'Cannot reveal an empty cycle. Add items before revealing.',
    );
  }

  // 2. Update cycle
  const { data: cycle, error } = await supabaseAdmin
    .from('delivery_cycles')
    .update({
      is_revealed: true,
      revealed_at: new Date().toISOString(),
      status: 'delivered' as const,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error revealing cycle:', error);
    throw new Error('Failed to reveal cycle.');
  }

  // 3. Activate REVEALED_BOX_ENABLED permanently
  const { error: configError } = await supabaseAdmin
    .from('site_config')
    .update({ value: 'true' })
    .eq('key', 'REVEALED_BOX_ENABLED');

  if (configError) {
    console.error(
      'Error activating REVEALED_BOX_ENABLED:',
      configError,
    );
    // Non-fatal — cycle was already revealed
  }

  return cycle;
}

/**
 * Archive a delivered cycle.
 */
export async function archiveCycle(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('delivery_cycles')
    .update({ status: 'archived' as const })
    .eq('id', id)
    .eq('status', 'delivered');

  if (error) {
    console.error('Error archiving cycle:', error);
    throw new Error('Failed to archive cycle.');
  }
}

// ============================================================================
// Delivery Cycle Items — Read (cached)
// ============================================================================

/**
 * Get all items for a cycle, ordered by sort_order.
 */
export const getCycleItems = cache(
  async (cycleId: string): Promise<DeliveryCycleItemRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('delivery_cycle_items')
      .select('*')
      .eq('delivery_cycle_id', cycleId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching cycle items:', error);
      throw new Error('Failed to load cycle items.');
    }

    return data ?? [];
  },
);

/**
 * Get a single cycle item by ID.
 */
export async function getCycleItemById(
  id: string,
): Promise<DeliveryCycleItemRow | null> {
  const { data, error } = await supabaseAdmin
    .from('delivery_cycle_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching cycle item:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Delivery Cycle Items — Write
// ============================================================================

/**
 * Create a new item in a delivery cycle.
 * Auto-sets sort_order to MAX(sort_order) + 1 if not provided.
 */
export async function createCycleItem(
  data: DeliveryCycleItemInsert,
): Promise<DeliveryCycleItemRow> {
  const insertData = { ...data };

  // Auto-assign sort_order if not provided
  if (insertData.sort_order === undefined || insertData.sort_order === null) {
    const { data: maxRow } = await supabaseAdmin
      .from('delivery_cycle_items')
      .select('sort_order')
      .eq('delivery_cycle_id', data.delivery_cycle_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    insertData.sort_order = (maxRow?.sort_order ?? 0) + 1;
  }

  const { data: item, error } = await supabaseAdmin
    .from('delivery_cycle_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating cycle item:', error);
    throw new Error('Failed to create cycle item.');
  }

  return item;
}

/**
 * Update a cycle item.
 */
export async function updateCycleItem(
  id: string,
  data: DeliveryCycleItemUpdate,
): Promise<DeliveryCycleItemRow> {
  const { data: item, error } = await supabaseAdmin
    .from('delivery_cycle_items')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating cycle item:', error);
    throw new Error('Failed to update cycle item.');
  }

  return item;
}

/**
 * Delete a cycle item.
 */
export async function deleteCycleItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('delivery_cycle_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cycle item:', error);
    throw new Error('Failed to delete cycle item.');
  }
}

/**
 * Reorder items within a cycle.
 * Updates sort_order based on position in itemIds array.
 * Validates all IDs belong to the specified cycle.
 */
export async function reorderCycleItems(
  cycleId: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;

  // 1. Verify all items belong to this cycle
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('delivery_cycle_items')
    .select('id')
    .eq('delivery_cycle_id', cycleId);

  if (fetchError) {
    console.error('Error fetching cycle items for reorder:', fetchError);
    throw new Error('Failed to verify cycle items.');
  }

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const invalid = itemIds.filter((id) => !existingIds.has(id));
  if (invalid.length > 0) {
    throw new Error(
      `Items do not belong to cycle ${cycleId}: ${invalid.join(', ')}`,
    );
  }

  // 2. Bulk update sort_order
  const updates = itemIds.map((id, index) =>
    supabaseAdmin
      .from('delivery_cycle_items')
      .update({ sort_order: index + 1 })
      .eq('id', id),
  );

  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    console.error('Errors during reorder:', failed.map((r) => r.error));
    throw new Error('Failed to reorder some cycle items.');
  }
}

// ============================================================================
// Config Helpers
// ============================================================================

/**
 * Fetch all delivery-related site_config keys in one query.
 * Returns a map like { SUBSCRIPTION_DELIVERY_DAY: '5', FIRST_DELIVERY_DATE: '2026-03-08', ... }
 */
export const getDeliveryConfigMap = cache(
  async (): Promise<Record<string, string | null>> => {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('key, value')
      .in('key', [...DELIVERY_CONFIG_KEYS]);

    if (error) {
      console.error('Error fetching delivery config:', error);
      throw new Error('Failed to load delivery configuration.');
    }

    const configMap: Record<string, string | null> = {};
    for (const key of DELIVERY_CONFIG_KEYS) {
      const row = (data ?? []).find(
        (r: { key: string; value: string }) => r.key === key,
      );
      configMap[key] = row ? row.value : null;
    }

    return configMap;
  },
);

/**
 * Update a delivery-related site_config value.
 * Validates the key is one of the known delivery config keys
 * and the value is appropriate for the key's type.
 */
export async function updateDeliveryConfig(
  key: string,
  value: string,
): Promise<void> {
  // Validate key
  if (!DELIVERY_CONFIG_KEYS.includes(key as DeliveryConfigKey)) {
    throw new Error(
      `Invalid delivery config key: ${key}. Allowed: ${DELIVERY_CONFIG_KEYS.join(', ')}`,
    );
  }

  // Validate value based on key
  if (key === 'SUBSCRIPTION_DELIVERY_DAY') {
    const day = parseInt(value, 10);
    if (isNaN(day) || day < 1 || day > 28) {
      throw new Error('SUBSCRIPTION_DELIVERY_DAY must be a number between 1 and 28.');
    }
  }

  if (key === 'FIRST_DELIVERY_DATE' && value) {
    // Must be a valid ISO date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('FIRST_DELIVERY_DATE must be in YYYY-MM-DD format.');
    }
  }

  if (
    key === 'SUBSCRIPTION_ENABLED' ||
    key === 'REVEALED_BOX_ENABLED'
  ) {
    if (value !== 'true' && value !== 'false') {
      throw new Error(`${key} must be 'true' or 'false'.`);
    }
  }

  const { error } = await supabaseAdmin
    .from('site_config')
    .update({ value })
    .eq('key', key);

  if (error) {
    console.error(`Error updating delivery config ${key}:`, error);
    throw new Error(`Failed to update ${key}.`);
  }
}
