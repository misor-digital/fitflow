/**
 * Marketing Campaign Reporting Service
 * Server-side aggregation for campaign reporting and follow-up functionality
 */

import { supabase } from '@/lib/supabase';
import type { MarketingCampaignRow } from './types';

// ============================================================================
// Types
// ============================================================================

export type CampaignType = 'primary' | 'follow_up';

export interface CampaignReportingStats {
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  clicks: number;
  uniqueClickers: number;
  leads: number;
  revenue: number;
  sentToLeadRate: number;
  clickToLeadRate: number;
  timeWindow: {
    start: string | null;
    end: string;
  };
}

export interface LeadsByBoxType {
  boxType: string;
  leadCount: number;
  revenue: number;
}

export interface LeadsByPromo {
  hasPromo: boolean;
  leadCount: number;
  revenue: number;
  avgDiscount: number;
}

export interface CampaignReportingData {
  stats: CampaignReportingStats;
  breakdowns: {
    byBoxType: LeadsByBoxType[];
    byPromo: LeadsByPromo[];
  };
  followUps: FollowUpCampaignSummary[];
}

export interface FollowUpCampaignSummary {
  id: string;
  name: string;
  status: string;
  campaignType: CampaignType;
  followUpWindowHours: number | null;
  sentCount: number;
  createdAt: string;
}

export interface NonConvertedRecipient {
  recipientId: string;
  email: string;
  name: string | null;
}

export interface CreateFollowUpOptions {
  name: string;
  subject: string;
  template: string;
  previewText?: string;
  scheduledStartAt?: string;
  followUpWindowHours?: number;
}

// ============================================================================
// Reporting Functions
// ============================================================================

/**
 * Get comprehensive reporting stats for a campaign
 */
export async function getCampaignReportingStats(
  campaignId: string
): Promise<{ data: CampaignReportingStats | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_campaign_reporting_stats', {
      p_campaign_id: campaignId,
    });

    if (error) {
      console.error('Error fetching reporting stats:', error);
      return { data: null, error: new Error(error.message) };
    }

    // RPC returns an array, get first row
    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      return {
        data: {
          totalEligible: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          clicks: 0,
          uniqueClickers: 0,
          leads: 0,
          revenue: 0,
          sentToLeadRate: 0,
          clickToLeadRate: 0,
          timeWindow: { start: null, end: new Date().toISOString() },
        },
        error: null,
      };
    }

    return {
      data: {
        totalEligible: Number(row.total_eligible) || 0,
        sent: Number(row.total_sent) || 0,
        failed: Number(row.total_failed) || 0,
        skipped: Number(row.total_skipped) || 0,
        clicks: Number(row.total_clicks) || 0,
        uniqueClickers: Number(row.unique_clickers) || 0,
        leads: Number(row.total_leads) || 0,
        revenue: Number(row.total_revenue) || 0,
        sentToLeadRate: Number(row.sent_to_lead_rate) || 0,
        clickToLeadRate: Number(row.click_to_lead_rate) || 0,
        timeWindow: {
          start: row.campaign_start,
          end: row.campaign_end,
        },
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching reporting stats:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get lead breakdown by box type
 */
export async function getLeadsByBoxType(
  campaignId: string
): Promise<{ data: LeadsByBoxType[] | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_campaign_leads_by_box_type', {
      p_campaign_id: campaignId,
    });

    if (error) {
      console.error('Error fetching leads by box type:', error);
      return { data: null, error: new Error(error.message) };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map((row: { box_type: string; lead_count: number; revenue: number }) => ({
        boxType: row.box_type,
        leadCount: Number(row.lead_count) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching leads by box type:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get lead breakdown by promo usage
 */
export async function getLeadsByPromo(
  campaignId: string
): Promise<{ data: LeadsByPromo[] | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_campaign_leads_by_promo', {
      p_campaign_id: campaignId,
    });

    if (error) {
      console.error('Error fetching leads by promo:', error);
      return { data: null, error: new Error(error.message) };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map((row: { has_promo: boolean; lead_count: number; revenue: number; avg_discount: number }) => ({
        hasPromo: row.has_promo,
        leadCount: Number(row.lead_count) || 0,
        revenue: Number(row.revenue) || 0,
        avgDiscount: Number(row.avg_discount) || 0,
      })),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching leads by promo:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get full reporting data for a campaign
 */
export async function getCampaignReportingData(
  campaignId: string
): Promise<{ data: CampaignReportingData | null; error: Error | null }> {
  try {
    const [statsResult, boxTypeResult, promoResult, followUpsResult] = await Promise.all([
      getCampaignReportingStats(campaignId),
      getLeadsByBoxType(campaignId),
      getLeadsByPromo(campaignId),
      getFollowUpCampaigns(campaignId),
    ]);

    if (statsResult.error) {
      return { data: null, error: statsResult.error };
    }

    return {
      data: {
        stats: statsResult.data!,
        breakdowns: {
          byBoxType: boxTypeResult.data || [],
          byPromo: promoResult.data || [],
        },
        followUps: followUpsResult.data || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching reporting data:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================================================
// Follow-Up Campaign Functions
// ============================================================================

/**
 * Get follow-up campaigns for a parent campaign
 */
export async function getFollowUpCampaigns(
  parentCampaignId: string
): Promise<{ data: FollowUpCampaignSummary[] | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_follow_up_campaigns', {
      p_parent_campaign_id: parentCampaignId,
    });

    if (error) {
      console.error('Error fetching follow-up campaigns:', error);
      return { data: null, error: new Error(error.message) };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map((row: {
        id: string;
        name: string;
        status: string;
        campaign_type: CampaignType;
        follow_up_window_hours: number | null;
        sent_count: number;
        created_at: string;
      }) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        campaignType: row.campaign_type,
        followUpWindowHours: row.follow_up_window_hours,
        sentCount: row.sent_count,
        createdAt: row.created_at,
      })),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching follow-up campaigns:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get non-converted recipients for follow-up
 */
export async function getNonConvertedRecipients(
  parentCampaignId: string,
  windowHours: number = 48,
  followUpCampaignId?: string
): Promise<{ data: NonConvertedRecipient[] | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_non_converted_recipients', {
      p_parent_campaign_id: parentCampaignId,
      p_window_hours: windowHours,
      p_follow_up_campaign_id: followUpCampaignId || null,
    });

    if (error) {
      console.error('Error fetching non-converted recipients:', error);
      return { data: null, error: new Error(error.message) };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map((row: { recipient_id: string; email: string; name: string | null }) => ({
        recipientId: row.recipient_id,
        email: row.email,
        name: row.name,
      })),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching non-converted recipients:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Count non-converted recipients
 */
export async function countNonConvertedRecipients(
  parentCampaignId: string,
  windowHours: number = 48
): Promise<{ count: number; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('count_non_converted_recipients', {
      p_parent_campaign_id: parentCampaignId,
      p_window_hours: windowHours,
    });

    if (error) {
      console.error('Error counting non-converted recipients:', error);
      return { count: 0, error: new Error(error.message) };
    }

    return { count: Number(data) || 0, error: null };
  } catch (err) {
    console.error('Error counting non-converted recipients:', err);
    return { count: 0, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Create a follow-up campaign for non-converters
 */
export async function createFollowUpCampaign(
  parentCampaignId: string,
  options: CreateFollowUpOptions
): Promise<{ data: MarketingCampaignRow | null; eligibleCount: number; error: Error | null }> {
  try {
    // Verify parent campaign exists
    const { data: parentCampaign, error: parentError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', parentCampaignId)
      .single();

    if (parentError || !parentCampaign) {
      return { data: null, eligibleCount: 0, error: new Error('Parent campaign not found') };
    }

    // Check parent campaign status
    const parent = parentCampaign as MarketingCampaignRow;
    if (parent.status !== 'completed' && parent.status !== 'sending') {
      return { 
        data: null, 
        eligibleCount: 0, 
        error: new Error(`Cannot create follow-up for campaign with status: ${parent.status}`) 
      };
    }

    const windowHours = options.followUpWindowHours || 48;

    // Count eligible recipients
    const { count: eligibleCount, error: countError } = await countNonConvertedRecipients(
      parentCampaignId,
      windowHours
    );

    if (countError) {
      return { data: null, eligibleCount: 0, error: countError };
    }

    if (eligibleCount === 0) {
      return { data: null, eligibleCount: 0, error: new Error('No eligible recipients for follow-up') };
    }

    // Create the follow-up campaign
    const { data: campaign, error: createError } = await supabase
      .from('marketing_campaigns')
      .insert({
        name: options.name,
        subject: options.subject,
        template: options.template,
        preview_text: options.previewText || null,
        scheduled_start_at: options.scheduledStartAt || null,
        status: options.scheduledStartAt ? 'scheduled' : 'draft',
        parent_campaign_id: parentCampaignId,
        campaign_type: 'follow_up',
        follow_up_window_hours: windowHours,
        // Inherit recipient filter from parent but we'll use non-converted logic
        recipient_filter: parent.recipient_filter,
      } as never)
      .select()
      .single();

    if (createError) {
      console.error('Error creating follow-up campaign:', createError);
      return { data: null, eligibleCount, error: new Error(createError.message) };
    }

    return { data: campaign as MarketingCampaignRow, eligibleCount, error: null };
  } catch (err) {
    console.error('Error creating follow-up campaign:', err);
    return { data: null, eligibleCount: 0, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Populate send records for a follow-up campaign
 * Uses non-converted recipients from parent campaign
 */
export async function populateFollowUpSends(
  followUpCampaignId: string
): Promise<{ created: number; error: Error | null }> {
  try {
    // Get the follow-up campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', followUpCampaignId)
      .single();

    if (campaignError || !campaign) {
      return { created: 0, error: new Error('Follow-up campaign not found') };
    }

    const followUp = campaign as MarketingCampaignRow & {
      parent_campaign_id: string | null;
      campaign_type: CampaignType;
      follow_up_window_hours: number | null;
    };

    if (followUp.campaign_type !== 'follow_up' || !followUp.parent_campaign_id) {
      return { created: 0, error: new Error('Campaign is not a follow-up campaign') };
    }

    // Get non-converted recipients
    const { data: recipients, error: recipientsError } = await getNonConvertedRecipients(
      followUp.parent_campaign_id,
      followUp.follow_up_window_hours || 48,
      followUpCampaignId
    );

    if (recipientsError || !recipients || recipients.length === 0) {
      return { created: 0, error: recipientsError || new Error('No eligible recipients') };
    }

    // Create send records
    const sends = recipients.map((r) => ({
      campaign_id: followUpCampaignId,
      recipient_id: r.recipientId,
      email: r.email,
      status: 'queued',
    }));

    // Insert in batches
    const batchSize = 100;
    let created = 0;

    for (let i = 0; i < sends.length; i += batchSize) {
      const batch = sends.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('marketing_sends')
        .insert(batch as never[]);

      if (insertError && !insertError.message.includes('unique_campaign_recipient')) {
        console.error('Error creating sends:', insertError);
        return { created, error: new Error(insertError.message) };
      }
      created += batch.length;
    }

    // Update campaign total_recipients
    await supabase
      .from('marketing_campaigns')
      .update({ total_recipients: created } as never)
      .eq('id', followUpCampaignId);

    return { created, error: null };
  } catch (err) {
    console.error('Error populating follow-up sends:', err);
    return { created: 0, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get parent campaign for a follow-up
 */
export async function getParentCampaign(
  followUpCampaignId: string
): Promise<{ data: MarketingCampaignRow | null; error: Error | null }> {
  try {
    // First get the follow-up campaign to find parent_campaign_id
    const { data: followUp, error: followUpError } = await supabase
      .from('marketing_campaigns')
      .select('parent_campaign_id')
      .eq('id', followUpCampaignId)
      .single();

    if (followUpError || !followUp) {
      return { data: null, error: new Error('Follow-up campaign not found') };
    }

    const parentId = (followUp as { parent_campaign_id: string | null }).parent_campaign_id;
    if (!parentId) {
      return { data: null, error: null }; // Not a follow-up campaign
    }

    const { data: parent, error: parentError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', parentId)
      .single();

    if (parentError) {
      return { data: null, error: new Error(parentError.message) };
    }

    return { data: parent as MarketingCampaignRow, error: null };
  } catch (err) {
    console.error('Error fetching parent campaign:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
