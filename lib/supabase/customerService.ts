/**
 * Customer Service
 * 
 * Handles customer profile and preorder operations:
 * - Get customer profile
 * - Update customer profile
 * - Get customer preorders
 * - Claim preorders
 */

import { createClient } from './server';
import { supabase as adminClient } from './client';
import type { CustomerRow, CustomerUpdate, PreorderRow } from '@/lib/domain';
import { mapCustomer } from '@/lib/domain/mappers/customer.mapper';
import type { CustomerDTO } from '@/lib/domain/dto/customer.dto';

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  preferredLanguage?: 'bg' | 'en';
  marketingConsent?: boolean;
}

/**
 * Get customer profile by user ID
 */
export async function getCustomerProfile(userId: string): Promise<{
  data: CustomerDTO | null;
  error: Error | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error ? new Error(error.message) : new Error('Customer not found'),
    };
  }

  return {
    data: mapCustomer(data as CustomerRow),
    error: null,
  };
}

/**
 * Update customer profile
 * Only allows updating own profile (enforced by RLS)
 */
export async function updateCustomerProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<{
  data: CustomerDTO | null;
  error: Error | null;
}> {
  const supabase = await createClient();

  // Build update object
  const updateData: CustomerUpdate = {};
  
  if (updates.fullName !== undefined) {
    updateData.full_name = updates.fullName;
  }
  
  if (updates.phone !== undefined) {
    updateData.phone = updates.phone || null;
  }
  
  if (updates.preferredLanguage !== undefined) {
    updateData.preferred_language = updates.preferredLanguage;
  }
  
  if (updates.marketingConsent !== undefined) {
    updateData.marketing_consent = updates.marketingConsent;
    if (updates.marketingConsent) {
      updateData.marketing_consent_date = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error ? new Error(error.message) : new Error('Failed to update profile'),
    };
  }

  return {
    data: mapCustomer(data as CustomerRow),
    error: null,
  };
}

/**
 * Get all preorders for a customer
 * Only returns preorders linked to the customer's account
 */
export async function getCustomerPreorders(userId: string): Promise<{
  data: PreorderRow[] | null;
  error: Error | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('preorders')
    .select('*')
    .eq('customer_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as PreorderRow[],
    error: null,
  };
}

/**
 * Get unclaimed preorders by email
 * Returns preorders that match the customer's email but aren't claimed yet
 */
export async function getUnclaimedPreordersByEmail(email: string): Promise<{
  data: PreorderRow[] | null;
  error: Error | null;
}> {
  // Use admin client to bypass RLS for this query
  const { data, error } = await adminClient
    .from('preorders')
    .select('*')
    .eq('email', email)
    .is('customer_user_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as PreorderRow[],
    error: null,
  };
}

/**
 * Claim a preorder by linking it to the customer's account
 * Uses direct update instead of RPC function (types not yet generated)
 */
export async function claimPreorder(
  preorderId: string,
  userId: string,
  email: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  // Use admin client to bypass RLS for this operation
  // First verify the preorder exists and email matches
  const { data: preorder, error: fetchError } = await adminClient
    .from('preorders')
    .select('id, email, customer_user_id')
    .eq('id', preorderId)
    .single();

  if (fetchError || !preorder) {
    return {
      success: false,
      error: new Error('Preorder not found'),
    };
  }

  // Check if already claimed by another user
  if (preorder.customer_user_id && preorder.customer_user_id !== userId) {
    return {
      success: false,
      error: new Error('Preorder already claimed by another user'),
    };
  }

  // Check if emails match (case-insensitive)
  if (preorder.email.toLowerCase() !== email.toLowerCase()) {
    return {
      success: false,
      error: new Error('Email does not match preorder'),
    };
  }

  // Claim the preorder
  const { error: updateError } = await adminClient
    .from('preorders')
    .update({ customer_user_id: userId })
    .eq('id', preorderId);

  if (updateError) {
    return {
      success: false,
      error: new Error(updateError.message),
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Get a single preorder by ID (must belong to customer)
 */
export async function getCustomerPreorder(
  preorderId: string,
  userId: string
): Promise<{
  data: PreorderRow | null;
  error: Error | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('preorders')
    .select('*')
    .eq('id', preorderId)
    .eq('customer_user_id', userId)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error ? new Error(error.message) : new Error('Preorder not found'),
    };
  }

  return {
    data: data as PreorderRow,
    error: null,
  };
}
