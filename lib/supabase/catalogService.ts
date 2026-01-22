/**
 * Catalog Service
 * Handles box types, options, and site configuration management
 * Part of Phase 3: Marketing & Internal Tooling - Week 2
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { BoxTypeRow, OptionRow } from '@/lib/domain';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

// Legacy type aliases - use domain types instead
export type BoxType = BoxTypeRow;
export type Option = OptionRow;

export interface SiteConfig {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface ServiceResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// BOX TYPES MANAGEMENT
// ============================================================================

/**
 * List all box types
 */
export async function listBoxTypes(): Promise<ServiceResult<BoxType[]>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('box_types')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Failed to list box types:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: data as BoxType[],
    };
  } catch (error) {
    console.error('Error listing box types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single box type by ID
 */
export async function getBoxType(id: string): Promise<ServiceResult<BoxType>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('box_types')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Box type not found' };
    }
    
    return {
      success: true,
      data: data as BoxType,
    };
  } catch (error) {
    console.error('Error getting box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new box type
 */
export async function createBoxType(
  data: {
    name: string;
    description: string;
    basePrice: number;
  },
  createdBy: string
): Promise<ServiceResult<BoxType>> {
  const supabase = getServiceClient();
  
  try {
    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from('box_types')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrder = (maxOrder?.sort_order || 0) + 1;
    
    const { data: boxType, error } = await supabase
      .from('box_types')
      .insert({
        name: data.name,
        description: data.description,
        base_price: data.basePrice,
        is_active: true,
        sort_order: nextOrder,
      } as any)
      .select()
      .single();
    
    if (error || !boxType) {
      console.error('Failed to create box type:', error);
      return { success: false, error: error?.message || 'Failed to create box type' };
    }
    
    // Log creation
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: createdBy,
      p_actor_email: null,
      p_action: 'box_type.created',
      p_resource_type: 'box_type',
      p_resource_id: boxType.id,
      p_metadata: { name: data.name, base_price: data.basePrice },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: boxType as BoxType,
    };
  } catch (error) {
    console.error('Error creating box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a box type
 */
export async function updateBoxType(
  id: string,
  data: {
    name?: string;
    description?: string;
    basePrice?: number;
  },
  updatedBy: string
): Promise<ServiceResult<BoxType>> {
  const supabase = getServiceClient();
  
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.base_price = data.basePrice;
    
    const { data: boxType, error } = await supabase
      .from('box_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !boxType) {
      console.error('Failed to update box type:', error);
      return { success: false, error: error?.message || 'Failed to update box type' };
    }
    
    // Log update
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: null,
      p_action: 'box_type.updated',
      p_resource_type: 'box_type',
      p_resource_id: id,
      p_metadata: updateData,
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: boxType as BoxType,
    };
  } catch (error) {
    console.error('Error updating box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle box type active status
 */
export async function toggleBoxType(
  id: string,
  updatedBy: string
): Promise<ServiceResult<BoxType>> {
  const supabase = getServiceClient();
  
  try {
    // Get current status
    const { data: current } = await supabase
      .from('box_types')
      .select('is_enabled')
      .eq('id', id)
      .single();
    
    if (!current) {
      return { success: false, error: 'Box type not found' };
    }
    
    const { data: boxType, error } = await supabase
      .from('box_types')
      .update({ is_enabled: !current.is_enabled } as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !boxType) {
      console.error('Failed to toggle box type:', error);
      return { success: false, error: error?.message || 'Failed to toggle box type' };
    }
    
    // Log toggle
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: null,
      p_action: 'box_type.toggled',
      p_resource_type: 'box_type',
      p_resource_id: id,
      p_metadata: { is_enabled: !current.is_enabled },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: boxType as BoxType,
    };
  } catch (error) {
    console.error('Error toggling box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reorder box types
 */
export async function reorderBoxTypes(
  order: string[],
  updatedBy: string
): Promise<ServiceResult<void>> {
  const supabase = getServiceClient();
  
  try {
    // Update sort_order for each box type
    for (let i = 0; i < order.length; i++) {
      await supabase
        .from('box_types')
        .update({ sort_order: i + 1 } as any)
        .eq('id', order[i]);
    }
    
    // Log reorder
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: null,
      p_action: 'box_types.reordered',
      p_resource_type: 'box_type',
      p_resource_id: null,
      p_metadata: { order },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return { success: true };
  } catch (error) {
    console.error('Error reordering box types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a box type
 */
export async function deleteBoxType(
  id: string,
  deletedBy: string
): Promise<ServiceResult<void>> {
  const supabase = getServiceClient();
  
  try {
    // Get box type name for logging
    const { data: boxType } = await supabase
      .from('box_types')
      .select('name')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('box_types')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Failed to delete box type:', error);
      return { success: false, error: error.message };
    }
    
    // Log deletion
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: deletedBy,
      p_actor_email: null,
      p_action: 'box_type.deleted',
      p_resource_type: 'box_type',
      p_resource_id: id,
      p_metadata: { name: boxType?.name },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// OPTIONS MANAGEMENT
// ============================================================================

/**
 * List options by set ID
 */
export async function listOptions(setId: string): Promise<ServiceResult<Option[]>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('options')
      .select('*')
      .eq('set_id', setId)
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Failed to list options:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: data as Option[],
    };
  } catch (error) {
    console.error('Error listing options:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new option
 */
export async function createOption(
  setId: string,
  data: {
    value: string;
    label: string;
    priceModifier: number;
  },
  createdBy: string
): Promise<ServiceResult<Option>> {
  const supabase = getServiceClient();
  
  try {
    // Get max sort_order for this set
    const { data: maxOrder } = await supabase
      .from('options')
      .select('sort_order')
      .eq('set_id', setId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrder = (maxOrder?.sort_order || 0) + 1;
    
    const { data: option, error } = await supabase
      .from('options')
      .insert({
        set_id: setId,
        value: data.value,
        label: data.label,
        price_modifier: data.priceModifier,
        is_active: true,
        sort_order: nextOrder,
      } as any)
      .select()
      .single();
    
    if (error || !option) {
      console.error('Failed to create option:', error);
      return { success: false, error: error?.message || 'Failed to create option' };
    }
    
    // Log creation
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: createdBy,
      p_actor_email: null,
      p_action: 'option.created',
      p_resource_type: 'option',
      p_resource_id: option.id,
      p_metadata: { set_id: setId, value: data.value, label: data.label },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: option as Option,
    };
  } catch (error) {
    console.error('Error creating option:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an option
 */
export async function updateOption(
  id: string,
  data: {
    value?: string;
    label?: string;
    priceModifier?: number;
  },
  updatedBy: string
): Promise<ServiceResult<Option>> {
  const supabase = getServiceClient();
  
  try {
    const updateData: any = {};
    if (data.value !== undefined) updateData.value = data.value;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.priceModifier !== undefined) updateData.price_modifier = data.priceModifier;
    
    const { data: option, error } = await supabase
      .from('options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !option) {
      console.error('Failed to update option:', error);
      return { success: false, error: error?.message || 'Failed to update option' };
    }
    
    // Log update
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: null,
      p_action: 'option.updated',
      p_resource_type: 'option',
      p_resource_id: id,
      p_metadata: updateData,
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: option as Option,
    };
  } catch (error) {
    console.error('Error updating option:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete an option
 */
export async function deleteOption(
  id: string,
  deletedBy: string
): Promise<ServiceResult<void>> {
  const supabase = getServiceClient();
  
  try {
    // Get option details for logging
    const { data: option } = await supabase
      .from('options')
      .select('set_id, value, label')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('options')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Failed to delete option:', error);
      return { success: false, error: error.message };
    }
    
    // Log deletion
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: deletedBy,
      p_actor_email: null,
      p_action: 'option.deleted',
      p_resource_type: 'option',
      p_resource_id: id,
      p_metadata: option,
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting option:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SITE CONFIG MANAGEMENT
// ============================================================================

/**
 * List all site configuration
 */
export async function listSiteConfig(): Promise<ServiceResult<SiteConfig[]>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .order('key', { ascending: true });
    
    if (error) {
      console.error('Failed to list site config:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: data as SiteConfig[],
    };
  } catch (error) {
    console.error('Error listing site config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get site config by key
 */
export async function getSiteConfigByKey(key: string): Promise<ServiceResult<SiteConfig>> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Config key not found' };
    }
    
    return {
      success: true,
      data: data as SiteConfig,
    };
  } catch (error) {
    console.error('Error getting site config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update site config value
 */
export async function updateSiteConfig(
  key: string,
  value: string,
  updatedBy: string
): Promise<ServiceResult<SiteConfig>> {
  const supabase = getServiceClient();
  
  try {
    const { data: config, error } = await supabase
      .from('site_config')
      .update({ value } as any)
      .eq('key', key)
      .select()
      .single();
    
    if (error || !config) {
      console.error('Failed to update site config:', error);
      return { success: false, error: error?.message || 'Failed to update site config' };
    }
    
    // Log update
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: updatedBy,
      p_actor_email: null,
      p_action: 'site_config.updated',
      p_resource_type: 'site_config',
      p_resource_id: key,
      p_metadata: { key, value },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      data: config as SiteConfig,
    };
  } catch (error) {
    console.error('Error updating site config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
