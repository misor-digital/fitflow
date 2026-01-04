/**
 * Marketing campaign service
 * Handles CRUD operations for campaigns, recipients, and sends
 */

import { supabase } from '@/lib/supabase';
import type {
  MarketingCampaignRow,
  MarketingCampaignInsert,
  MarketingCampaignUpdate,
  MarketingRecipientRow,
  MarketingRecipientInsert,
  MarketingRecipientUpdate,
  MarketingSendRow,
  MarketingSendInsert,
  MarketingSendUpdate,
  CampaignProgress,
  RecipientFilter,
  SendStatus,
} from './types';

// ============================================================================
// Campaign Operations
// ============================================================================

/**
 * Create a new marketing campaign
 */
export async function createCampaign(
  data: MarketingCampaignInsert
): Promise<{ data: MarketingCampaignRow | null; error: Error | null }> {
  try {
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .insert(data as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: campaign as MarketingCampaignRow, error: null };
  } catch (err) {
    console.error('Error creating campaign:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a campaign by ID
 */
export async function getCampaignById(
  id: string
): Promise<{ data: MarketingCampaignRow | null; error: Error | null }> {
  try {
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: campaign as MarketingCampaignRow, error: null };
  } catch (err) {
    console.error('Error fetching campaign:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string,
  data: MarketingCampaignUpdate
): Promise<{ data: MarketingCampaignRow | null; error: Error | null }> {
  try {
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .update(data as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: campaign as MarketingCampaignRow, error: null };
  } catch (err) {
    console.error('Error updating campaign:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get campaigns ready to send (scheduled and past start time)
 */
export async function getScheduledCampaignsReadyToSend(): Promise<{
  data: MarketingCampaignRow[] | null;
  error: Error | null;
}> {
  try {
    const { data: campaigns, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_start_at', new Date().toISOString())
      .order('scheduled_start_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: campaigns as MarketingCampaignRow[], error: null };
  } catch (err) {
    console.error('Error fetching scheduled campaigns:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(): Promise<{
  data: MarketingCampaignRow[] | null;
  error: Error | null;
}> {
  try {
    const { data: campaigns, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: campaigns as MarketingCampaignRow[], error: null };
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================================================
// Recipient Operations
// ============================================================================

/**
 * Create or update a recipient (upsert by email)
 */
export async function upsertRecipient(
  data: MarketingRecipientInsert
): Promise<{ data: MarketingRecipientRow | null; error: Error | null }> {
  try {
    // First try to find existing recipient
    const { data: existing } = await supabase
      .from('marketing_recipients')
      .select('*')
      .ilike('email', data.email)
      .single();

    const existingRecipient = existing as MarketingRecipientRow | null;

    if (existingRecipient) {
      // Update existing
      const updateData: MarketingRecipientUpdate = {
        name: data.name ?? existingRecipient.name,
        tags: data.tags ?? existingRecipient.tags,
        source: data.source ?? existingRecipient.source,
        metadata: data.metadata ?? existingRecipient.metadata,
      };

      const { data: updated, error } = await supabase
        .from('marketing_recipients')
        .update(updateData as never)
        .eq('id', existingRecipient.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: updated as MarketingRecipientRow, error: null };
    }

    // Create new
    const { data: recipient, error } = await supabase
      .from('marketing_recipients')
      .insert(data as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating recipient:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: recipient as MarketingRecipientRow, error: null };
  } catch (err) {
    console.error('Error upserting recipient:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get recipient by email
 */
export async function getRecipientByEmail(
  email: string
): Promise<{ data: MarketingRecipientRow | null; error: Error | null }> {
  try {
    const { data: recipient, error } = await supabase
      .from('marketing_recipients')
      .select('*')
      .ilike('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching recipient:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: recipient as MarketingRecipientRow | null, error: null };
  } catch (err) {
    console.error('Error fetching recipient:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update recipient subscription status
 */
export async function updateRecipientSubscription(
  email: string,
  subscribed: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const updateData: MarketingRecipientUpdate = {
      subscribed,
      unsubscribed_at: subscribed ? null : new Date().toISOString(),
    };

    const { error } = await supabase
      .from('marketing_recipients')
      .update(updateData as never)
      .ilike('email', email);

    if (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating subscription:', err);
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get recipients matching a filter
 */
export async function getRecipientsByFilter(
  filter: RecipientFilter
): Promise<{ data: MarketingRecipientRow[] | null; error: Error | null }> {
  try {
    let query = supabase.from('marketing_recipients').select('*');

    // Filter by subscription status (default: subscribed only)
    if (filter.subscribedOnly !== false) {
      query = query.eq('subscribed', true);
    }

    // Filter by tags (must have ALL)
    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags);
    }

    // Filter by tags (must have ANY) - use OR
    if (filter.tagsAny && filter.tagsAny.length > 0) {
      query = query.overlaps('tags', filter.tagsAny);
    }

    // Exclude tags
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      // Recipients must NOT have any of these tags
      for (const tag of filter.excludeTags) {
        query = query.not('tags', 'cs', `{${tag}}`);
      }
    }

    const { data: recipients, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching recipients:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: recipients as MarketingRecipientRow[], error: null };
  } catch (err) {
    console.error('Error fetching recipients:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Bulk import recipients
 */
export async function bulkImportRecipients(
  recipients: MarketingRecipientInsert[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  for (const recipient of recipients) {
    const { error } = await upsertRecipient(recipient);
    if (error) {
      errors.push(`${recipient.email}: ${error.message}`);
    } else {
      imported++;
    }
  }

  return { imported, errors };
}

// ============================================================================
// Send Operations
// ============================================================================

/**
 * Create send records for a campaign
 */
export async function createSendsForCampaign(
  campaignId: string,
  recipients: MarketingRecipientRow[]
): Promise<{ created: number; error: Error | null }> {
  try {
    const sends: MarketingSendInsert[] = recipients.map((r) => ({
      campaign_id: campaignId,
      recipient_id: r.id,
      email: r.email,
      status: 'queued' as SendStatus,
    }));

    // Insert in batches to avoid hitting limits
    const batchSize = 100;
    let created = 0;

    for (let i = 0; i < sends.length; i += batchSize) {
      const batch = sends.slice(i, i + batchSize);
      const { error } = await supabase
        .from('marketing_sends')
        .insert(batch as never[]);

      if (error) {
        // Handle duplicate constraint - some may already exist
        if (!error.message.includes('unique_campaign_recipient')) {
          console.error('Error creating sends:', error);
          return { created, error: new Error(error.message) };
        }
      }
      created += batch.length;
    }

    // Update campaign total_recipients
    await updateCampaign(campaignId, { total_recipients: created });

    return { created, error: null };
  } catch (err) {
    console.error('Error creating sends:', err);
    return { created: 0, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get pending sends for a campaign (queued or failed with retries remaining)
 */
export async function getPendingSends(
  campaignId: string,
  limit: number = 50
): Promise<{ data: MarketingSendRow[] | null; error: Error | null }> {
  try {
    const now = new Date().toISOString();

    const { data: sends, error } = await supabase
      .from('marketing_sends')
      .select('*')
      .eq('campaign_id', campaignId)
      .or(`status.eq.queued,and(status.eq.failed,next_retry_at.lte.${now})`)
      .lt('attempt_count', 3) // Less than max attempts
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching pending sends:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: sends as MarketingSendRow[], error: null };
  } catch (err) {
    console.error('Error fetching pending sends:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update a send record
 */
export async function updateSend(
  id: string,
  data: MarketingSendUpdate
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('marketing_sends')
      .update(data as never)
      .eq('id', id);

    if (error) {
      console.error('Error updating send:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating send:', err);
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Mark a send as sent
 */
export async function markSendAsSent(
  id: string,
  messageId: string
): Promise<{ success: boolean; error: Error | null }> {
  return updateSend(id, {
    status: 'sent',
    provider_message_id: messageId,
    sent_at: new Date().toISOString(),
    error: null,
  });
}

/**
 * Mark a send as failed with retry scheduling
 */
export async function markSendAsFailed(
  id: string,
  errorMessage: string,
  attemptCount: number,
  maxAttempts: number = 3,
  retryDelayMs: number = 60000
): Promise<{ success: boolean; error: Error | null }> {
  const shouldRetry = attemptCount < maxAttempts;
  const nextRetryAt = shouldRetry
    ? new Date(Date.now() + retryDelayMs * Math.pow(2, attemptCount - 1)).toISOString()
    : null;

  return updateSend(id, {
    status: 'failed',
    error: errorMessage,
    attempt_count: attemptCount,
    next_retry_at: nextRetryAt,
  });
}

/**
 * Mark a send as skipped
 */
export async function markSendAsSkipped(
  id: string,
  reason: string
): Promise<{ success: boolean; error: Error | null }> {
  return updateSend(id, {
    status: 'skipped',
    error: reason,
  });
}

// ============================================================================
// Campaign Progress
// ============================================================================

/**
 * Get campaign progress stats
 */
export async function getCampaignProgress(
  campaignId: string
): Promise<{ data: CampaignProgress | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_campaign_progress', {
      p_campaign_id: campaignId,
    });

    if (error) {
      console.error('Error fetching campaign progress:', error);
      return { data: null, error: new Error(error.message) };
    }

    // RPC returns an array, get first row
    const progress = Array.isArray(data) ? data[0] : data;

    return { data: progress as CampaignProgress, error: null };
  } catch (err) {
    console.error('Error fetching campaign progress:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update campaign stats from sends
 */
export async function syncCampaignStats(
  campaignId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: progress, error: progressError } = await getCampaignProgress(campaignId);

    if (progressError || !progress) {
      return { success: false, error: progressError };
    }

    const { error } = await updateCampaign(campaignId, {
      total_recipients: progress.total,
      sent_count: progress.sent,
      failed_count: progress.failed,
      skipped_count: progress.skipped,
    });

    return { success: !error, error };
  } catch (err) {
    console.error('Error syncing campaign stats:', err);
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================================================
// Locking
// ============================================================================

/**
 * Acquire a lock on a campaign for sending
 */
export async function acquireCampaignLock(
  campaignId: string,
  runnerId: string,
  timeoutMinutes: number = 10
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('acquire_campaign_lock', {
      p_campaign_id: campaignId,
      p_runner_id: runnerId,
      p_lock_timeout_minutes: timeoutMinutes,
    });

    if (error) {
      console.error('Error acquiring lock:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error acquiring lock:', err);
    return false;
  }
}

/**
 * Release a lock on a campaign
 */
export async function releaseCampaignLock(
  campaignId: string,
  runnerId: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('release_campaign_lock', {
      p_campaign_id: campaignId,
      p_runner_id: runnerId,
    });

    if (error) {
      console.error('Error releasing lock:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error releasing lock:', err);
    return false;
  }
}
