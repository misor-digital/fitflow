/**
 * Campaign runner - handles sending marketing campaigns
 * Implements batching, rate limiting, locking, and retry logic
 */

import { sendEmail, EMAIL_CONFIG } from '@/lib/email';
import {
  getCampaignById,
  updateCampaign,
  getScheduledCampaignsReadyToSend,
  getRecipientsByFilter,
  getRecipientByEmail,
  createSendsForCampaign,
  getPendingSends,
  markSendAsSent,
  markSendAsFailed,
  markSendAsSkipped,
  syncCampaignStats,
  acquireCampaignLock,
  releaseCampaignLock,
} from './campaignService';
import { generateEmail } from './templates';
import { escapeHtml } from './templates/base';
import type {
  MarketingCampaignRow,
  MarketingSendRow,
  CampaignRunnerConfig,
  TemplateVariables,
  RecipientFilter,
} from './types';
import { DEFAULT_RUNNER_CONFIG } from './types';

// ============================================================================
// Runner State
// ============================================================================

interface RunnerState {
  isRunning: boolean;
  runnerId: string;
  currentCampaignId: string | null;
  processedCount: number;
  errorCount: number;
  startedAt: Date | null;
}

const state: RunnerState = {
  isRunning: false,
  runnerId: `runner-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  currentCampaignId: null,
  processedCount: 0,
  errorCount: 0,
  startedAt: null,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique runner ID
 */
export function generateRunnerId(): string {
  return `runner-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// Send Single Email
// ============================================================================

/**
 * Send a single campaign email to a recipient
 * Respects campaign's subscribedOnly filter setting
 */
async function sendCampaignEmail(
  campaign: MarketingCampaignRow,
  send: MarketingSendRow,
  config: CampaignRunnerConfig
): Promise<{ success: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  try {
    // Get recipient details if we have recipient_id
    let recipientName: string | undefined;
    
    if (send.recipient_id) {
      const { data: recipient } = await getRecipientByEmail(send.email);
      if (recipient) {
        recipientName = recipient.name || undefined;
        
        // Check subscription status only if campaign filter requires it
        const filter = campaign.recipient_filter as RecipientFilter | null;
        const subscribedOnly = filter?.subscribedOnly !== false; // Default to true
        
        if (subscribedOnly && !recipient.subscribed) {
          return { success: false, error: 'Recipient unsubscribed', skipped: true };
        }
      }
    }

    // Prepare template variables - merge campaign template variables with recipient data
    const templateVars = typeof campaign.template === 'string' 
      ? JSON.parse(campaign.template) 
      : campaign.template;
    
    const variables: TemplateVariables = {
      ...templateVars,
      email: send.email,
      name: recipientName,
    };

    // Get template ID from campaign template data
    const templateId = templateVars.templateId || 'discount';
    
    // Render the email content using template service
    const htmlContent = generateEmail(templateId, variables, campaign.id);

    // Render subject with variables (simple replacement)
    let subject = campaign.subject;
    if (recipientName) {
      subject = subject.replace(/\{\{name\}\}/g, escapeHtml(recipientName));
    }
    subject = subject.replace(/\{\{email\}\}/g, escapeHtml(send.email));

    // DRY-RUN MODE: Skip actual sending
    if (config.dryRun) {
      console.log(`[Campaign Runner] DRY-RUN: Would send to ${send.email}`);
      return { success: false, error: 'Dry-run mode - email not sent', skipped: true };
    }

    // Send via Brevo
    const result = await sendEmail({
      to: {
        email: send.email,
        name: recipientName,
      },
      subject,
      htmlContent,
      tags: [EMAIL_CONFIG.tags.marketing, `campaign-${campaign.id}`],
    });

    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error sending campaign email to ${send.email}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Process Campaign
// ============================================================================

/**
 * Process a single campaign - send all pending emails
 */
async function processCampaign(
  campaign: MarketingCampaignRow,
  config: CampaignRunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<{ sent: number; failed: number; skipped: number }> {
  const stats = { sent: 0, failed: 0, skipped: 0 };
  
  console.log(`[Campaign Runner] Processing campaign: ${campaign.name} (${campaign.id})`);

  // Try to acquire lock
  const locked = await acquireCampaignLock(
    campaign.id,
    state.runnerId,
    config.lockTimeoutMinutes
  );

  if (!locked) {
    console.log(`[Campaign Runner] Could not acquire lock for campaign ${campaign.id}`);
    return stats;
  }

  try {
    // For scheduled campaigns, create send records if they don't exist yet
    if (campaign.status === 'scheduled') {
      // Check if sends already exist
      const { data: existingSends } = await getPendingSends(campaign.id, 1);
      
      if (!existingSends || existingSends.length === 0) {
        console.log(`[Campaign Runner] Creating send records for scheduled campaign ${campaign.id}`);
        
        // Get recipients based on filter
        const filter: RecipientFilter = campaign.recipient_filter || { subscribedOnly: true };
        const { data: recipients, error: recipientError } = await getRecipientsByFilter(filter);
        
        if (recipientError || !recipients || recipients.length === 0) {
          console.log(`[Campaign Runner] No recipients found for campaign ${campaign.id}`);
          await updateCampaign(campaign.id, { status: 'completed', completed_at: new Date().toISOString() });
          return stats;
        }
        
        console.log(`[Campaign Runner] Creating sends for ${recipients.length} recipients`);
        
        // Create send records
        const { created, error: createError } = await createSendsForCampaign(campaign.id, recipients);
        
        if (createError) {
          console.error(`[Campaign Runner] Failed to create sends: ${createError.message}`);
          return stats;
        }
        
        // Update total recipients
        await updateCampaign(campaign.id, { total_recipients: created });
      }
      
      // Update campaign status to sending
      await updateCampaign(campaign.id, {
        status: 'sending',
        started_at: new Date().toISOString(),
      });
    }

    // Process in batches
    let hasMore = true;
    
    while (hasMore) {
      // Get next batch of pending sends
      const { data: sends, error } = await getPendingSends(campaign.id, config.batchSize);

      if (error || !sends || sends.length === 0) {
        hasMore = false;
        continue;
      }

      console.log(`[Campaign Runner] Processing batch of ${sends.length} sends`);

      // Process each send in the batch
      for (const send of sends) {
        // Check if campaign was paused/cancelled
        const { data: currentCampaign } = await getCampaignById(campaign.id);
        if (currentCampaign?.status === 'paused' || currentCampaign?.status === 'cancelled') {
          console.log(`[Campaign Runner] Campaign ${campaign.id} was ${currentCampaign.status}`);
          hasMore = false;
          break;
        }

        // Send the email
        const result = await sendCampaignEmail(campaign, send, config);

        if (result.success && result.messageId) {
          await markSendAsSent(send.id, result.messageId);
          stats.sent++;
          state.processedCount++;
        } else if (result.skipped) {
          // Skipped sends (unsubscribed, dry-run, etc.)
          await markSendAsSkipped(send.id, result.error || 'Skipped');
          stats.skipped++;
        } else {
          const attemptCount = send.attempt_count + 1;
          await markSendAsFailed(
            send.id,
            result.error || 'Unknown error',
            attemptCount,
            config.maxRetryAttempts,
            config.retryBaseDelayMs
          );
          
          if (attemptCount >= config.maxRetryAttempts) {
            stats.failed++;
            state.errorCount++;
          }
        }

        // Rate limiting delay between sends
        if (config.sendDelayMs > 0) {
          await sleep(config.sendDelayMs);
        }
      }

      // Delay between batches
      if (hasMore && config.batchDelayMs > 0) {
        await sleep(config.batchDelayMs);
      }

      // Sync stats periodically
      await syncCampaignStats(campaign.id);
    }

    // Check if campaign is complete
    await syncCampaignStats(campaign.id);
    const { data: updatedCampaign } = await getCampaignById(campaign.id);
    
    if (updatedCampaign && updatedCampaign.status === 'sending') {
      // Check if all sends are processed
      const { data: remainingSends } = await getPendingSends(campaign.id, 1);
      
      if (!remainingSends || remainingSends.length === 0) {
        await updateCampaign(campaign.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        console.log(`[Campaign Runner] Campaign ${campaign.id} completed`);
      }
    }

  } finally {
    // Always release lock
    await releaseCampaignLock(campaign.id, state.runnerId);
  }

  console.log(`[Campaign Runner] Campaign ${campaign.id} batch complete:`, stats);
  return stats;
}

// ============================================================================
// Main Runner
// ============================================================================

/**
 * Run the campaign processor once
 * Checks for scheduled campaigns and processes them
 */
export async function runCampaignProcessor(
  config: CampaignRunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<{ processed: number; errors: number }> {
  if (state.isRunning) {
    console.log('[Campaign Runner] Already running, skipping');
    return { processed: 0, errors: 0 };
  }

  state.isRunning = true;
  state.startedAt = new Date();
  state.processedCount = 0;
  state.errorCount = 0;

  try {
    console.log('[Campaign Runner] Starting campaign processor');

    // Get campaigns ready to send
    const { data: campaigns, error } = await getScheduledCampaignsReadyToSend();

    if (error) {
      console.error('[Campaign Runner] Error fetching campaigns:', error);
      return { processed: 0, errors: 1 };
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('[Campaign Runner] No campaigns ready to send');
      return { processed: 0, errors: 0 };
    }

    console.log(`[Campaign Runner] Found ${campaigns.length} campaigns to process`);

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        await processCampaign(campaign, config);
      } catch (error) {
        console.error(`[Campaign Runner] Error processing campaign ${campaign.id}:`, error);
        state.errorCount++;
      }
    }

    // Note: Campaigns in 'sending' status (interrupted) are handled by the lock mechanism.
    // A separate query for 'sending' status campaigns could be added here if needed.

    return { processed: state.processedCount, errors: state.errorCount };

  } finally {
    state.isRunning = false;
    state.currentCampaignId = null;
    console.log('[Campaign Runner] Processor finished');
  }
}

/**
 * Start a specific campaign immediately
 */
export async function startCampaign(
  campaignId: string,
  config: CampaignRunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get campaign
    const { data: campaign, error } = await getCampaignById(campaignId);

    if (error || !campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return { success: false, error: `Cannot start campaign with status: ${campaign.status}` };
    }

    // Get recipients based on filter
    const filter: RecipientFilter = campaign.recipient_filter || { subscribedOnly: true };
    const { data: recipients, error: recipientError } = await getRecipientsByFilter(filter);

    if (recipientError || !recipients || recipients.length === 0) {
      return { success: false, error: 'No recipients found for campaign' };
    }

    console.log(`[Campaign Runner] Creating sends for ${recipients.length} recipients`);

    // Create send records
    const { created, error: createError } = await createSendsForCampaign(campaignId, recipients);

    if (createError) {
      return { success: false, error: `Failed to create sends: ${createError.message}` };
    }

    // Update campaign status
    await updateCampaign(campaignId, {
      status: 'scheduled',
      scheduled_start_at: new Date().toISOString(),
      total_recipients: created,
    });

    // Process immediately
    await processCampaign({ ...campaign, status: 'scheduled' }, config);

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Campaign Runner] Error starting campaign:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Pause a running campaign
 */
export async function pauseCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: campaign, error } = await getCampaignById(campaignId);

    if (error || !campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status !== 'sending') {
      return { success: false, error: `Cannot pause campaign with status: ${campaign.status}` };
    }

    await updateCampaign(campaignId, { status: 'paused' });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(
  campaignId: string,
  config: CampaignRunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: campaign, error } = await getCampaignById(campaignId);

    if (error || !campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status !== 'paused') {
      return { success: false, error: `Cannot resume campaign with status: ${campaign.status}` };
    }

    await updateCampaign(campaignId, { status: 'sending' });

    // Process immediately
    await processCampaign({ ...campaign, status: 'sending' }, config);

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: campaign, error } = await getCampaignById(campaignId);

    if (error || !campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      return { success: false, error: `Cannot cancel campaign with status: ${campaign.status}` };
    }

    await updateCampaign(campaignId, { status: 'cancelled' });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Runner Status
// ============================================================================

/**
 * Get current runner status
 */
export function getRunnerStatus(): {
  isRunning: boolean;
  runnerId: string;
  currentCampaignId: string | null;
  processedCount: number;
  errorCount: number;
  startedAt: Date | null;
} {
  return { ...state };
}
