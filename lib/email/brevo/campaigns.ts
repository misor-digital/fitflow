/**
 * Brevo Email Campaigns API Wrapper
 *
 * Wraps campaign creation, scheduling, sending, and statistics.
 * Used for marketing emails (preorder conversion, promotional, etc.)
 */

import * as Brevo from '@getbrevo/brevo';
import { getEmailCampaignsApi } from '../client';
import { DEFAULT_SENDER } from '../client';

export interface CreateCampaignOptions {
  name: string;
  subject: string;
  templateId?: number;          // Brevo template ID
  htmlContent?: string;         // Mutually exclusive with templateId
  sender?: { email: string; name: string };
  replyTo?: string;
  recipients: {
    listIds?: number[];         // Brevo contact list IDs
    exclusionListIds?: number[];
  };
  scheduledAt?: string;         // ISO 8601 UTC datetime
  tag?: string;
  params?: Record<string, unknown>;
}

export interface CampaignResult {
  success: boolean;
  campaignId?: number;
  error?: string;
}

export interface CampaignStatsResult {
  success: boolean;
  stats?: {
    sent: number;
    delivered: number;
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
    hardBounces: number;
    softBounces: number;
    unsubscribed: number;
  };
  error?: string;
}

/**
 * Create a marketing email campaign in Brevo
 */
export async function createBrevoCampaign(options: CreateCampaignOptions): Promise<CampaignResult> {
  try {
    const api = getEmailCampaignsApi();
    const campaign = new Brevo.CreateEmailCampaign();

    campaign.name = options.name;
    campaign.subject = options.subject;
    campaign.sender = options.sender ?? {
      email: DEFAULT_SENDER.email ?? '',
      name: DEFAULT_SENDER.name ?? '',
    };

    if (options.templateId) {
      campaign.templateId = options.templateId;
    } else if (options.htmlContent) {
      campaign.htmlContent = options.htmlContent;
    }

    if (options.replyTo) {
      campaign.replyTo = options.replyTo;
    }
    if (options.recipients) {
      campaign.recipients = options.recipients;
    }
    if (options.scheduledAt) {
      campaign.scheduledAt = options.scheduledAt;
    }
    if (options.tag) {
      campaign.tag = options.tag;
    }
    if (options.params) {
      campaign.params = options.params;
    }

    const response = await api.createEmailCampaign(campaign);

    return {
      success: true,
      campaignId: response.body.id,
    };
  } catch (error) {
    console.error('Error creating Brevo campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating campaign',
    };
  }
}

/**
 * Send an existing campaign immediately
 */
export async function sendBrevoCampaign(campaignId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const api = getEmailCampaignsApi();
    await api.sendEmailCampaignNow(campaignId);
    return { success: true };
  } catch (error) {
    console.error('Error sending Brevo campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending campaign',
    };
  }
}

/**
 * Send a test email for a campaign
 */
export async function sendBrevoCampaignTest(
  campaignId: number,
  testEmails: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = getEmailCampaignsApi();
    const emailTo = new Brevo.SendTestEmail();
    emailTo.emailTo = testEmails;
    await api.sendTestEmail(campaignId, emailTo);
    return { success: true };
  } catch (error) {
    console.error('Error sending Brevo campaign test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending test',
    };
  }
}

/**
 * Get campaign statistics from Brevo
 */
export async function getBrevoCampaignStats(campaignId: number): Promise<CampaignStatsResult> {
  try {
    const api = getEmailCampaignsApi();
    const response = await api.getEmailCampaign(campaignId);
    const stats = response.body.statistics?.globalStats;

    return {
      success: true,
      stats: stats ? {
        sent: stats.sent ?? 0,
        delivered: stats.delivered ?? 0,
        opens: stats.viewed ?? 0,
        uniqueOpens: stats.uniqueViews ?? 0,
        clicks: stats.clickers ?? 0,
        uniqueClicks: stats.uniqueClicks ?? 0,
        hardBounces: stats.hardBounces ?? 0,
        softBounces: stats.softBounces ?? 0,
        unsubscribed: stats.unsubscriptions ?? 0,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching Brevo campaign stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching stats',
    };
  }
}

/**
 * Delete a draft/scheduled campaign
 */
export async function deleteBrevoCampaign(campaignId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const api = getEmailCampaignsApi();
    await api.deleteEmailCampaign(campaignId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting Brevo campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting campaign',
    };
  }
}
