/**
 * Promo Code Service
 * Handles promo code management and validation
 * Part of Phase 3: Marketing & Internal Tooling - Week 3
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { PromoCodeRow } from '@/lib/domain';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

// Legacy type alias - use domain types instead
export type PromoCode = PromoCodeRow;

export interface ServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// PROMO CODE MANAGEMENT
// ============================================================================

/**
 * List all promo codes
 */
export async function listPromoCodes(): Promise<ServiceResult<PromoCode[]>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to list promo codes:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: data as PromoCode[],
    };
  } catch (error) {
    console.error('Error listing promo codes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single promo code by ID
 */
export async function getPromoCode(id: string): Promise<ServiceResult<PromoCode>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Promo code not found' };
    }
    
    return {
      success: true,
      data: data as PromoCode,
    };
  } catch (error) {
    console.error('Error getting promo code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new promo code
 */
export async function createPromoCode(
  data: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom?: string;
    validUntil?: string;
    usageLimit?: number;
  },
  createdBy: string
): Promise<ServiceResult<PromoCode>> {
  const supabase = getServiceClient();
  
  try {
    // Check if code already exists
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', data.code.toUpperCase())
      .single();
    
    if (existing) {
      return { success: false, error: 'Promo code already exists' };
    }
    
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .insert({
        code: data.code.toUpperCase(),
        discount_percent: data.discountValue,
        is_enabled: true,
        starts_at: data.validFrom || null,
        ends_at: data.validUntil || null,
        max_uses: data.usageLimit || null,
        current_uses: 0,
      })
      .select()
      .single();
    
    if (error || !promoCode) {
      console.error('Failed to create promo code:', error);
      return { success: false, error: error?.message || 'Failed to create promo code' };
    }
    
    // Log creation
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: createdBy,
      p_actor_email: '',
      p_action: 'promo_code.created',
      p_resource_type: 'promo_code',
      p_resource_id: (promoCode).id,
      p_metadata: { code: data.code, discount_type: data.discountType, discount_value: data.discountValue },
      p_ip_address: null,
      p_user_agent: '',
    });
    
    return {
      success: true,
      data: promoCode as PromoCode,
    };
  } catch (error) {
    console.error('Error creating promo code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a promo code
 */
export async function updatePromoCode(
  id: string,
  data: {
    code?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    validFrom?: string;
    validUntil?: string;
    usageLimit?: number;
  },
  updatedBy: string
): Promise<ServiceResult<PromoCode>> {
  const supabase = getServiceClient();
  
  try {
    const updateData: Record<string, string | number | null> = {};
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.discountType !== undefined) updateData.discount_type = data.discountType;
    if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
    if (data.validFrom !== undefined) updateData.valid_from = data.validFrom;
    if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;
    if (data.usageLimit !== undefined) updateData.usage_limit = data.usageLimit;
    
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !promoCode) {
      console.error('Failed to update promo code:', error);
      return { success: false, error: error?.message || 'Failed to update promo code' };
    }
    
    // Log update
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: '',
      p_action: 'promo_code.updated',
      p_resource_type: 'promo_code',
      p_resource_id: id,
      p_metadata: updateData,
      p_ip_address: null,
      p_user_agent: '',
    });
    
    return {
      success: true,
      data: promoCode as PromoCode,
    };
  } catch (error) {
    console.error('Error updating promo code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle promo code active status
 */
export async function togglePromoCode(
  id: string,
  updatedBy: string
): Promise<ServiceResult<PromoCode>> {
  const supabase = getServiceClient();
  
  try {
    // Get current status
    const { data: current } = await supabase
      .from('promo_codes')
      .select('is_enabled')
      .eq('id', id)
      .single();
    
    if (!current) {
      return { success: false, error: 'Promo code not found' };
    }
    
    const currentStatus = current.is_enabled;
    
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .update({ is_enabled: !currentStatus })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !promoCode) {
      console.error('Failed to toggle promo code:', error);
      return { success: false, error: error?.message || 'Failed to toggle promo code' };
    }
    
    // Log toggle
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: '',
      p_action: 'promo_code.toggled',
      p_resource_type: 'promo_code',
      p_resource_id: id,
      p_metadata: { is_active: !currentStatus },
      p_ip_address: null,
      p_user_agent: '',
    });
    
    return {
      success: true,
      data: promoCode as PromoCode,
    };
  } catch (error) {
    console.error('Error toggling promo code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a promo code
 */
export async function deletePromoCode(
  id: string,
  deletedBy: string
): Promise<ServiceResult<void>> {
  const supabase = getServiceClient();
  
  try {
    // Get promo code for logging
    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('code')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Failed to delete promo code:', error);
      return { success: false, error: error.message };
    }
    
    // Log deletion
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: deletedBy,
      p_actor_email: '',
      p_action: 'promo_code.deleted',
      p_resource_type: 'promo_code',
      p_resource_id: id,
      p_metadata: { code: promoCode?.code },
      p_ip_address: null,
      p_user_agent: '',
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get promo code usage statistics
 */
export async function getPromoCodeStats(id: string): Promise<ServiceResult<{
  code: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  usageLimit: number | null;
  totalUsage: number;
  totalDiscount: number;
  totalRevenue: number;
  recentOrders: Array<{ discount_percent: number | null; final_price_eur: number | null; created_at: string }>;
}>> {
  const supabase = getServiceClient();
  
  try {
    // Get promo code
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (promoError || !promoCode) {
      return { success: false, error: 'Promo code not found' };
    }
    
    // Get usage from orders
    const { data: orders, error: ordersError } = await supabase
      .from('preorders')
      .select('discount_percent, final_price_eur, created_at')
      .eq('promo_code', promoCode.code);
    
    if (ordersError) {
      console.error('Failed to get promo code stats:', ordersError);
      return { success: false, error: ordersError.message };
    }
    
    const totalUsage = orders?.length || 0;
    const totalDiscount = orders?.reduce((sum, order) => {
      const originalPrice = order.final_price_eur || 0;
      const discountPercent = order.discount_percent || 0;
      return sum + (originalPrice * discountPercent / 100);
    }, 0) || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.final_price_eur || 0), 0) || 0;
    
    const pc = promoCode;
    
    return {
      success: true,
      data: {
        code: pc.code,
        discountType: 'percentage',
        discountValue: pc.discount_percent,
        isActive: pc.is_enabled,
        usageLimit: pc.max_uses,
        totalUsage,
        totalDiscount,
        totalRevenue,
        recentOrders: orders?.slice(0, 10) || [],
      },
    };
  } catch (error) {
    console.error('Error getting promo code stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
