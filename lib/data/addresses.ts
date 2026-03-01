/**
 * Address data access layer
 * Server-only functions for managing user addresses
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AddressRow, AddressInsert, AddressUpdate } from '@/lib/supabase/types';

// ============================================================================
// Read operations (cached per request via React.cache)
// ============================================================================

/**
 * Get all addresses for a user, default address first.
 */
export const getAddressesByUser = cache(async (userId: string): Promise<AddressRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }

  return data ?? [];
});

/**
 * Get a single address by ID with ownership check.
 * Returns null if not found or belongs to a different user.
 */
export const getAddressById = cache(
  async (addressId: string, userId: string): Promise<AddressRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching address:', error);
      return null;
    }

    return data;
  },
);

/**
 * Get the default address for a user.
 */
export const getDefaultAddress = cache(
  async (userId: string): Promise<AddressRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No default set
      }
      console.error('Error fetching default address:', error);
      return null;
    }

    return data;
  },
);

/**
 * Count addresses for a user — used to enforce max 10 addresses per user.
 * Wrapped in cache() for per-request deduplication.
 */
export const countAddressesByUser = cache(async (userId: string): Promise<number> => {
  const { count, error } = await supabaseAdmin
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error counting addresses:', error);
    throw new Error('Failed to count addresses.');
  }

  return count ?? 0;
});

// ============================================================================
// Write operations (never cached)
// ============================================================================

/**
 * Create a new address.
 */
export async function createAddress(data: AddressInsert): Promise<AddressRow> {
  const { data: created, error } = await supabaseAdmin
    .from('addresses')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating address:', error);
    throw new Error('Failed to create address.');
  }

  return created;
}

/**
 * Update an existing address with ownership check.
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  data: AddressUpdate,
): Promise<AddressRow> {
  const { data: updated, error } = await supabaseAdmin
    .from('addresses')
    .update(data)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating address:', error);
    throw new Error('Failed to update address.');
  }

  return updated;
}

/**
 * Delete an address with ownership check.
 */
export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  const { error, count } = await supabaseAdmin
    .from('addresses')
    .delete({ count: 'exact' })
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting address:', error);
    throw new Error('Failed to delete address.');
  }

  if (count === 0) {
    throw new Error('Address not found or does not belong to this user.');
  }
}

/**
 * Set an address as default. The DB trigger unsets other defaults for the user.
 */
export async function setDefaultAddress(addressId: string, userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('Error setting default address:', error);
    throw new Error('Failed to set default address.');
  }

  if (!data || data.length === 0) {
    throw new Error('Address not found or does not belong to this user.');
  }
}
