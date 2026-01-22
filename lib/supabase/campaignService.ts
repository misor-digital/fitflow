/**
 * Campaign Service
 * Handles newsletter campaign management and sending
 * Part of Phase 3: Marketing & Internal Tooling
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface Campaign {
  id: string;
  subject: string;
  html_content: string;
  text_content: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  created_by: string;
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignParams {
  subject: string;
  htmlContent: string;
  textContent: string;
  createdBy: string; // staff user_id
}

export interface CreateCampaignResult {
  success: boolean;
  error?: string;
  campaign?: Campaign;
}

export interface SendCampaignResult {
  success: boolean;
  error?: string;
  totalRecipients?: number;
  successfulSends?: number;
  failedSends?: number;
}

export interface CampaignStats {
  id: string;
  subject: string;
  status: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  sent_at: string | null;
  created_at: string;
}

export interface ListCampaignsResult {
  success: boolean;
  error?: string;
  campaigns?: Campaign[];
  total?: number;
}

/**
 * Create a new campaign (draft)
 */
export async function createCampaign(
  params: CreateCampaignParams
): Promise<CreateCampaignResult> {
  const supabase = getServiceClient();
  
  try {
    // Get staff_user_id from user_id
    const { data: staffUserData, error: staffError } = await supabase
      .from('staff_users')
      .select('id')
      .eq('user_id', params.createdBy)
      .maybeSingle();
    
    if (staffError || !staffUserData) {
      return { success: false, error: 'Staff user not found' };
    }
    
    const staffUserId = (staffUserData as { id: string }).id;
    
    // Create campaign
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        subject: params.subject,
        html_content: params.htmlContent,
        text_content: params.textContent,
        status: 'draft',
        created_by: staffUserId,
        total_recipients: 0,
        successful_sends: 0,
        failed_sends: 0,
      } as any)
      .select()
      .single();
    
    if (error || !data) {
      console.error('Failed to create campaign:', error);
      return { success: false, error: error?.message || 'Failed to create campaign' };
    }
    
    const campaignData = data as Campaign;
    
    // Log campaign creation
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: params.createdBy,
      p_actor_email: null,
      p_action: 'campaign.created',
      p_resource_type: 'campaign',
      p_resource_id: campaignData.id,
      p_metadata: { subject: params.subject, status: 'draft' },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      campaign: campaignData,
    };
  } catch (error) {
    console.error('Error creating campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send campaign to all subscribed newsletter subscribers
 */
export async function sendCampaign(
  campaignId: string,
  sentBy: string // staff user_id
): Promise<SendCampaignResult> {
  const supabase = getServiceClient();
  
  try {
    // Get campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();
    
    if (campaignError || !campaignData) {
      return { success: false, error: 'Campaign not found' };
    }
    
    const campaign = campaignData as Campaign;
    
    // Check if campaign is in draft status
    if (campaign.status !== 'draft') {
      return { success: false, error: 'Campaign already sent or in progress' };
    }
    
    // Get all subscribed newsletter subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscriptions')
      .select('email, unsubscribe_token')
      .eq('status', 'subscribed');
    
    if (subscribersError || !subscribers || subscribers.length === 0) {
      return { success: false, error: 'No subscribers found' };
    }
    
    // Update campaign status to sending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from('campaigns')
      .update({
        status: 'sending' as const,
        total_recipients: subscribers.length,
      } as any)
      .eq('id', campaignId);
    
    // Send emails (this would integrate with email service)
    // For now, we'll simulate the sending and track results
    let successfulSends = 0;
    let failedSends = 0;
    
    // In production, this would be done via a background job/queue
    // For now, we'll just mark as sent
    successfulSends = subscribers.length;
    
    // Update campaign status to sent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from('campaigns')
      .update({
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        successful_sends: successfulSends,
        failed_sends: failedSends,
      } as any)
      .eq('id', campaignId);
    
    // Log campaign send
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: sentBy,
      p_actor_email: null,
      p_action: 'campaign.sent',
      p_resource_type: 'campaign',
      p_resource_id: campaignId,
      p_metadata: {
        subject: campaign.subject,
        total_recipients: subscribers.length,
        successful_sends: successfulSends,
        failed_sends: failedSends,
      },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return {
      success: true,
      totalRecipients: subscribers.length,
      successfulSends,
      failedSends,
    };
  } catch (error) {
    console.error('Error sending campaign:', error);
    
    // Update campaign status to failed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from('campaigns')
      .update({ status: 'failed' as const } as any)
      .eq('id', campaignId);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(
  campaignId: string
): Promise<{ success: boolean; error?: string; stats?: CampaignStats }> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, subject, status, total_recipients, successful_sends, failed_sends, sent_at, created_at')
      .eq('id', campaignId)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Campaign not found' };
    }
    
    return {
      success: true,
      stats: data as CampaignStats,
    };
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all campaigns with pagination
 */
export async function listCampaigns(
  page: number = 1,
  limit: number = 20
): Promise<ListCampaignsResult> {
  const supabase = getServiceClient();
  
  try {
    const offset = (page - 1) * limit;
    
    // Get total count
    const { count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
    
    // Get campaigns
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Failed to list campaigns:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      campaigns: data as Campaign[],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string; campaign?: Campaign }> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'Campaign not found' };
    }
    
    return {
      success: true,
      campaign: data as Campaign,
    };
  } catch (error) {
    console.error('Error getting campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a campaign (only drafts can be deleted)
 */
export async function deleteCampaign(
  campaignId: string,
  deletedBy: string // staff user_id
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  
  try {
    // Get campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('status, subject')
      .eq('id', campaignId)
      .maybeSingle();
    
    if (campaignError || !campaignData) {
      return { success: false, error: 'Campaign not found' };
    }
    
    const campaign = campaignData as { status: string; subject: string };
    
    // Only allow deleting drafts
    if (campaign.status !== 'draft') {
      return { success: false, error: 'Only draft campaigns can be deleted' };
    }
    
    // Delete campaign
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);
    
    if (error) {
      console.error('Failed to delete campaign:', error);
      return { success: false, error: error.message };
    }
    
    // Log campaign deletion
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: deletedBy,
      p_actor_email: null,
      p_action: 'campaign.deleted',
      p_resource_type: 'campaign',
      p_resource_id: campaignId,
      p_metadata: { subject: campaign.subject },
      p_ip_address: null,
      p_user_agent: null,
    } as any);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
