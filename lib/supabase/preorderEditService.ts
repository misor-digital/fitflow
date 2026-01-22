/**
 * Preorder Edit Service
 * Handles token-based preorder editing via email links
 * Part of Phase 1: Minimal Safe Foundation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface PreorderEditToken {
  id: string;
  preorder_id: string;
  token: string;
  purpose: string; // Database stores as string, not enum
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface TokenValidationResult {
  valid: boolean;
  error?: 'not_found' | 'expired' | 'already_used' | 'invalid';
  preorder?: any;
  token?: PreorderEditToken;
}

/**
 * Generate a new edit token for a preorder
 */
export async function generateEditToken(
  preorderId: string,
  purpose: 'edit' | 'cancel' = 'edit'
): Promise<{ token: string; expiresAt: Date } | null> {
  const supabase = getServiceClient();
  
  // Check if preorder exists
  const { data: preorder, error: preorderError } = await supabase
    .from('preorders')
    .select('id, email, order_id')
    .eq('id', preorderId)
    .single();
  
  if (preorderError || !preorder) {
    console.error('Preorder not found:', preorderError);
    return null;
  }
  
  // Generate token with 24-hour expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  const { data: tokenData, error: tokenError } = await supabase
    .from('preorder_edit_tokens')
    .insert({
      preorder_id: preorderId,
      purpose,
      expires_at: expiresAt.toISOString(),
    })
    .select('token, expires_at')
    .single();
  
  if (tokenError || !tokenData) {
    console.error('Failed to generate token:', tokenError);
    return null;
  }
  
  return {
    token: tokenData.token,
    expiresAt: new Date(tokenData.expires_at),
  };
}

/**
 * Validate an edit token and return preorder data if valid
 */
export async function validateEditToken(
  token: string
): Promise<TokenValidationResult> {
  const supabase = getServiceClient();
  
  // Fetch token
  const { data: tokenData, error: tokenError } = await supabase
    .from('preorder_edit_tokens')
    .select('*')
    .eq('token', token)
    .single();
  
  if (tokenError || !tokenData) {
    return { valid: false, error: 'not_found' };
  }
  
  // Check if already used
  if (tokenData.used_at) {
    return { valid: false, error: 'already_used', token: tokenData };
  }
  
  // Check if expired
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  if (now > expiresAt) {
    return { valid: false, error: 'expired', token: tokenData };
  }
  
  // Fetch associated preorder
  const { data: preorder, error: preorderError } = await supabase
    .from('preorders')
    .select('*')
    .eq('id', tokenData.preorder_id)
    .single();
  
  if (preorderError || !preorder) {
    return { valid: false, error: 'invalid', token: tokenData };
  }
  
  return {
    valid: true,
    preorder,
    token: tokenData,
  };
}

/**
 * Update a preorder using a valid token
 */
export async function updatePreorderWithToken(
  token: string,
  updates: Partial<any>,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; preorder?: any }> {
  const supabase = getServiceClient();
  
  // Validate token first
  const validation = await validateEditToken(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const { preorder, token: tokenData } = validation;
  
  // Update preorder
  const { data: updatedPreorder, error: updateError } = await supabase
    .from('preorders')
    .update({
      ...updates,
      last_edited_at: new Date().toISOString(),
      edit_count: (preorder.edit_count || 0) + 1,
      ip_address: ipAddress || preorder.ip_address,
      user_agent: userAgent || preorder.user_agent,
    } as any)
    .eq('id', preorder.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Failed to update preorder:', updateError);
    return { success: false, error: 'update_failed' };
  }
  
  // Mark token as used
  await supabase
    .from('preorder_edit_tokens')
    .update({ used_at: new Date().toISOString() } as any)
    .eq('id', tokenData!.id);
  
  return { success: true, preorder: updatedPreorder };
}

/**
 * Cancel a preorder using a valid token
 */
export async function cancelPreorderWithToken(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  
  // Validate token first
  const validation = await validateEditToken(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const { preorder, token: tokenData } = validation;
  
  // In a real system, you might soft-delete or mark as cancelled
  // For now, we'll just delete the preorder
  const { error: deleteError } = await supabase
    .from('preorders')
    .delete()
    .eq('id', preorder.id);
  
  if (deleteError) {
    console.error('Failed to cancel preorder:', deleteError);
    return { success: false, error: 'cancel_failed' };
  }
  
  // Mark token as used
  await supabase
    .from('preorder_edit_tokens')
    .update({ used_at: new Date().toISOString() } as any)
    .eq('id', tokenData!.id);
  
  // Log cancellation
  await supabase.rpc('create_audit_log', {
    p_actor_type: 'anonymous' as any,
    p_actor_id: null,
    p_actor_email: preorder.email,
    p_action: 'preorder.cancelled',
    p_resource_type: 'preorder',
    p_resource_id: preorder.id,
    p_metadata: { order_id: preorder.order_id },
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  } as any);
  
  return { success: true };
}

/**
 * Check rate limit for token requests (max 3 per email per hour)
 */
export async function checkTokenRequestRateLimit(
  email: string
): Promise<{ allowed: boolean; remainingRequests: number }> {
  const supabase = getServiceClient();
  
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  // Count tokens created for this email in the last hour
  const { data: preorders } = await supabase
    .from('preorders')
    .select('id')
    .eq('email', email);
  
  if (!preorders || preorders.length === 0) {
    return { allowed: false, remainingRequests: 0 };
  }
  
  const preorderIds = preorders.map(p => p.id);
  
  const { count } = await supabase
    .from('preorder_edit_tokens')
    .select('id', { count: 'exact', head: true })
    .in('preorder_id', preorderIds)
    .gte('created_at', oneHourAgo.toISOString());
  
  const requestCount = count || 0;
  const maxRequests = 3;
  
  return {
    allowed: requestCount < maxRequests,
    remainingRequests: Math.max(0, maxRequests - requestCount),
  };
}
