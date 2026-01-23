/**
 * Newsletter Service
 * Handles newsletter subscriptions with double opt-in
 * Part of Phase 1: Minimal Safe Foundation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { SubscriptionStatus } from '@/lib/domain';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface SubscribeResult {
  success: boolean;
  error?: 'already_subscribed' | 'already_pending' | 'database_error';
  confirmationToken?: string;
}

export interface ConfirmResult {
  success: boolean;
  error?: 'not_found' | 'already_confirmed' | 'expired' | 'database_error';
}

export interface UnsubscribeResult {
  success: boolean;
  error?: 'not_found' | 'already_unsubscribed' | 'database_error';
}

/**
 * Subscribe to newsletter (creates pending subscription)
 */
export async function subscribeToNewsletter(
  email: string,
  source?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SubscribeResult> {
  const supabase = getServiceClient();
  
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if already subscribed or pending
  const { data: existing } = await supabase
    .from('newsletter_subscriptions')
    .select('status')
    .eq('email', normalizedEmail)
    .in('status', ['pending', 'subscribed'])
    .single();
  
  if (existing) {
    if (existing.status === 'subscribed') {
      return { success: false, error: 'already_subscribed' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'already_pending' };
    }
  }
  
  // Create new pending subscription
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .insert({
      email: normalizedEmail,
      status: 'pending',
      source: source || 'unknown',
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select('confirmation_token')
    .single();
  
  if (error || !data) {
    console.error('Failed to create newsletter subscription:', error);
    return { success: false, error: 'database_error' };
  }
  
  // Log subscription request
  await supabase.rpc('create_audit_log', {
    p_actor_type: 'anonymous',
    p_actor_id: '',
    p_actor_email: normalizedEmail,
    p_action: 'newsletter.subscribe_requested',
    p_resource_type: 'newsletter_subscription',
    p_resource_id: '',
    p_metadata: { source, status: 'pending' },
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  });
  
  return {
    success: true,
    confirmationToken: data.confirmation_token,
  };
}

/**
 * Confirm newsletter subscription via token
 */
export async function confirmNewsletterSubscription(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ConfirmResult> {
  const supabase = getServiceClient();
  
  // Find subscription by confirmation token
  const { data: subscription, error: fetchError } = await supabase
    .from('newsletter_subscriptions')
    .select('*')
    .eq('confirmation_token', token)
    .single();
  
  if (fetchError || !subscription) {
    return { success: false, error: 'not_found' };
  }
  
  // Check if already confirmed
  if (subscription.status === 'subscribed') {
    return { success: false, error: 'already_confirmed' };
  }
  
  // Check if expired (24 hours)
  const createdAt = new Date(subscription.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation > 24) {
    return { success: false, error: 'expired' };
  }
  
  // Confirm subscription
  const { error: updateError } = await supabase
    .from('newsletter_subscriptions')
    .update({
      status: 'subscribed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);
  
  if (updateError) {
    console.error('Failed to confirm subscription:', updateError);
    return { success: false, error: 'database_error' };
  }
  
  // Log confirmation
  await supabase.rpc('create_audit_log', {
    p_actor_type: 'anonymous',
    p_actor_id: '',
    p_actor_email: subscription.email,
    p_action: 'newsletter.confirmed',
    p_resource_type: 'newsletter_subscription',
    p_resource_id: subscription.id,
    p_metadata: { source: subscription.source },
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  });
  
  return { success: true };
}

/**
 * Unsubscribe from newsletter via token
 */
export async function unsubscribeFromNewsletter(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UnsubscribeResult> {
  const supabase = getServiceClient();
  
  // Find subscription by unsubscribe token
  const { data: subscription, error: fetchError } = await supabase
    .from('newsletter_subscriptions')
    .select('*')
    .eq('unsubscribe_token', token)
    .single();
  
  if (fetchError || !subscription) {
    return { success: false, error: 'not_found' };
  }
  
  // Check if already unsubscribed
  if (subscription.status === 'unsubscribed') {
    return { success: false, error: 'already_unsubscribed' };
  }
  
  // Unsubscribe
  const { error: updateError } = await supabase
    .from('newsletter_subscriptions')
    .update({
      status: 'unsubscribed',
    })
    .eq('id', subscription.id);
  
  if (updateError) {
    console.error('Failed to unsubscribe:', updateError);
    return { success: false, error: 'database_error' };
  }
  
  // Log unsubscribe
  await supabase.rpc('create_audit_log', {
    p_actor_type: 'anonymous',
    p_actor_id: '',
    p_actor_email: subscription.email,
    p_action: 'newsletter.unsubscribed',
    p_resource_type: 'newsletter_subscription',
    p_resource_id: subscription.id,
    p_metadata: { previous_status: subscription.status },
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  });
  
  return { success: true };
}

/**
 * Get subscription status by email
 */
export async function getSubscriptionStatus(
  email: string
): Promise<SubscriptionStatus | null> {
  const supabase = getServiceClient();
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data } = await supabase
    .from('newsletter_subscriptions')
    .select('status')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return data?.status || null;
}
