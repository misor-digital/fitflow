/**
 * Promo code data access layer
 * Server-only functions for validating and managing promo codes
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PromoCodeRow, PromoCodeInsert, PromoCodeUpdate, PromoCodeUsageRow } from '@/lib/supabase';

/**
 * Validate a promo code and return the promo data if valid
 * Checks: enabled, date range, usage limits
 */
export async function validatePromoCode(
  code: string | null | undefined,
  userId?: string
): Promise<PromoCodeRow | null> {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .ilike('code', normalizedCode)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const promo = data;

  // Check date range
  const now = new Date();
  
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return null; // Not yet active
  }
  
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    return null; // Expired
  }

  // Check usage limit
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return null; // Usage limit reached
  }

  // Check per-user usage limit
  if (userId && promo.max_uses_per_user !== null) {
    const { data: userUsageCount, error: usageError } = await supabaseAdmin.rpc(
      'check_user_promo_usage',
      { p_code: normalizedCode, p_user_id: userId }
    );
    if (!usageError && userUsageCount !== null && userUsageCount >= promo.max_uses_per_user) {
      return null; // Per-user limit reached
    }
  }

  return promo;
}

/**
 * Get discount percentage for a promo code
 * Returns 0 if code is invalid
 */
export async function getDiscountPercent(promoCode: string | null | undefined): Promise<number> {
  if (!promoCode) {
    return 0;
  }

  const promo = await validatePromoCode(promoCode);
  return promo?.discount_percent ?? 0;
}

/**
 * Check if a promo code is valid (quick validation)
 */
export async function isValidPromoCode(code: string | null | undefined): Promise<boolean> {
  const promo = await validatePromoCode(code);
  return promo !== null;
}

/**
 * Atomically increment the usage count for a promo code.
 * Uses an RPC function to avoid read-then-write race conditions.
 */
export async function incrementPromoCodeUsage(
  code: string,
  userId?: string,
  orderId?: string
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_promo_usage', {
    p_code: code.trim().toUpperCase(),
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (error) {
    console.error('Error incrementing promo code usage:', error);
    throw new Error('Failed to increment promo code usage');
  }
}

/**
 * Applied promo info for display
 */
export interface AppliedPromo {
  code: string;
  discountPercent: number;
}

/**
 * Get applied promo info for display purposes
 */
export async function getAppliedPromo(code: string | null | undefined): Promise<AppliedPromo | null> {
  const promo = await validatePromoCode(code);
  
  if (!promo) {
    return null;
  }

  return {
    code: promo.code,
    discountPercent: promo.discount_percent,
  };
}

// ---------------------------------------------------------------------------
// Derived status helper
// ---------------------------------------------------------------------------

export type PromoStatus = 'active' | 'inactive' | 'expired' | 'exhausted' | 'scheduled';

export function derivePromoStatus(promo: PromoCodeRow): PromoStatus {
  if (!promo.is_enabled) return 'inactive';
  const now = new Date();
  if (promo.ends_at && new Date(promo.ends_at) < now) return 'expired';
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) return 'exhausted';
  if (promo.starts_at && new Date(promo.starts_at) > now) return 'scheduled';
  return 'active';
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export interface PromoCodeFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'exhausted' | 'scheduled';
  sort?: 'newest' | 'oldest' | 'most-used' | 'code-asc';
  page?: number;
  limit?: number;
}

export interface PromoCodeListResult {
  data: PromoCodeRow[];
  total: number;
}

/**
 * List promo codes with filtering, sorting, and pagination.
 * Status filtering is computed in JS because some statuses (active, exhausted)
 * involve multiple conditions that are hard to express in a single query —
 * promo code volume is low so this is acceptable.
 */
export const listPromoCodes = cache(
  async (filters: PromoCodeFilters = {}): Promise<PromoCodeListResult> => {
    const {
      search,
      status = 'all',
      sort = 'newest',
      page = 1,
      limit = 20,
    } = filters;

    // Build base query — fetch all rows (volume is low)
    let query = supabaseAdmin.from('promo_codes').select('*');

    // Search filter (applied at DB level)
    if (search) {
      query = query.or(
        `code.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Simple status filters that map directly to DB columns
    if (status === 'inactive') {
      query = query.eq('is_enabled', false);
    } else if (status === 'expired') {
      query = query.eq('is_enabled', true).lt('ends_at', new Date().toISOString());
    }

    // Sort
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most-used':
        query = query.order('current_uses', { ascending: false });
        break;
      case 'code-asc':
        query = query.order('code', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Error listing promo codes:', error);
      throw new Error('Грешка при зареждане на промо кодове.');
    }

    let filtered = rows ?? [];

    // JS-level status filtering for complex statuses
    if (status === 'active' || status === 'exhausted' || status === 'scheduled') {
      filtered = filtered.filter((p) => derivePromoStatus(p) === status);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return { data: paginated, total };
  }
);

/**
 * Get a single promo code by ID
 */
export const getPromoCodeById = cache(
  async (id: string): Promise<PromoCodeRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
  }
);

/**
 * Create a new promo code
 */
export async function createPromoCode(input: PromoCodeInsert): Promise<PromoCodeRow> {
  const normalizedInput = { ...input, code: input.code.trim().toUpperCase() };

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .insert(normalizedInput)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Промо код с този код вече съществува.');
    }
    console.error('Error creating promo code:', error);
    throw new Error('Грешка при създаване на промо код.');
  }

  return data;
}

/**
 * Update an existing promo code
 */
export async function updatePromoCode(
  id: string,
  updates: PromoCodeUpdate
): Promise<PromoCodeRow> {
  const normalizedUpdates = updates.code
    ? { ...updates, code: updates.code.trim().toUpperCase() }
    : updates;

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .update(normalizedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Промо код с този код вече съществува.');
    }
    console.error('Error updating promo code:', error);
    throw new Error('Грешка при обновяване на промо код.');
  }

  return data;
}

/**
 * Delete a promo code (only if it has never been used)
 */
export async function deletePromoCode(id: string): Promise<void> {
  const existing = await getPromoCodeById(id);
  if (!existing) throw new Error('Промо кодът не е намерен.');
  if (existing.current_uses > 0) {
    throw new Error(
      'Не може да изтриете промо код, който е бил използван. Деактивирайте го вместо това.'
    );
  }

  const { error } = await supabaseAdmin
    .from('promo_codes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting promo code:', error);
    throw new Error('Грешка при изтриване на промо код.');
  }
}

/**
 * Toggle a promo code's enabled state
 */
export async function togglePromoCode(
  id: string,
  enabled: boolean
): Promise<PromoCodeRow> {
  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .update({ is_enabled: enabled })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling promo code:', error);
    throw new Error('Грешка при промяна на статуса.');
  }

  return data;
}

/**
 * Get usage stats for a promo code
 */
export interface PromoCodeStats {
  totalUses: number;
  uniqueUsers: number;
  recentUsages: PromoCodeUsageRow[];
}

export async function getPromoCodeStats(promoCodeId: string): Promise<PromoCodeStats> {
  const { data: usages, error } = await supabaseAdmin
    .from('promo_code_usages')
    .select('*')
    .eq('promo_code_id', promoCodeId)
    .order('used_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching promo code stats:', error);
    return { totalUses: 0, uniqueUsers: 0, recentUsages: [] };
  }

  const rows = usages ?? [];
  const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;

  return {
    totalUses: rows.length,
    uniqueUsers,
    recentUsages: rows.slice(0, 10),
  };
}
