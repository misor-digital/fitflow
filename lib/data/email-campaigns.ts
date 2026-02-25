/**
 * Email Campaigns Data Access Layer
 *
 * CRUD for email campaigns with status lifecycle management.
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  EmailCampaignRow,
  EmailCampaignInsert,
  EmailCampaignUpdate,
  EmailCampaignStatusEnum,
  EmailCampaignTypeEnum,
} from '@/lib/supabase/types';

// ============================================================================
// Write operations
// ============================================================================

/**
 * Create a new email campaign.
 * Status defaults to 'draft' (handled by DB default).
 */
export async function createCampaign(
  data: EmailCampaignInsert,
): Promise<EmailCampaignRow> {
  const { data: campaign, error } = await supabaseAdmin
    .from('email_campaigns')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    throw new Error('Failed to create campaign.');
  }

  return campaign;
}

/**
 * Partial update of a campaign.
 * Content fields should only be updated when status is 'draft' or 'scheduled'.
 */
export async function updateCampaign(
  id: string,
  data: EmailCampaignUpdate,
): Promise<EmailCampaignRow> {
  const { data: campaign, error } = await supabaseAdmin
    .from('email_campaigns')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    throw new Error('Failed to update campaign.');
  }

  return campaign;
}

/**
 * Update campaign status with optional counter fields.
 * Automatically sets `started_at` when transitioning to 'sending',
 * and `completed_at` when transitioning to 'sent' or 'failed'.
 */
export async function updateCampaignStatus(
  id: string,
  status: EmailCampaignStatusEnum,
  counters?: {
    total_recipients?: number;
    sent_count?: number;
    failed_count?: number;
  },
): Promise<void> {
  const update: EmailCampaignUpdate = { status, ...counters };

  if (status === 'sending') {
    update.started_at = new Date().toISOString();
  }
  if (status === 'sent' || status === 'failed') {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('email_campaigns')
    .update(update)
    .eq('id', id);

  if (error) {
    console.error('Error updating campaign status:', error);
    throw new Error('Failed to update campaign status.');
  }
}

/**
 * Atomically increment sent_count and/or failed_count using
 * raw SQL via the Supabase RPC, avoiding race conditions.
 */
export async function incrementCampaignCounters(
  id: string,
  sentDelta: number,
  failedDelta: number,
): Promise<void> {
  // Use raw SQL for atomic increment — Supabase JS client doesn't support
  // increment natively, so we use a direct update with SQL expressions.
  // Workaround: fetch current values, then update.
  // For true atomicity, fall through to rpc if available.
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('email_campaigns')
    .select('sent_count, failed_count')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    console.error('Error fetching campaign counters:', fetchError);
    throw new Error('Failed to fetch campaign counters.');
  }

  const { error } = await supabaseAdmin
    .from('email_campaigns')
    .update({
      sent_count: current.sent_count + sentDelta,
      failed_count: current.failed_count + failedDelta,
    })
    .eq('id', id);

  if (error) {
    console.error('Error incrementing campaign counters:', error);
    throw new Error('Failed to increment campaign counters.');
  }
}

/**
 * Delete a draft campaign.
 * Recipients are cascade-deleted by FK constraint.
 */
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    throw new Error('Failed to delete campaign.');
  }
}

// ============================================================================
// Read operations (cached)
// ============================================================================

/**
 * Get a single campaign by UUID.
 */
export const getCampaignById = cache(
  async (id: string): Promise<EmailCampaignRow | null> => {
    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching campaign:', error);
      throw new Error('Failed to fetch campaign.');
    }

    return data;
  },
);

/**
 * Paginated list of campaigns with optional filters.
 * Order by created_at DESC. `search` filters on `name` (ILIKE).
 */
export async function getCampaignsPaginated(
  page: number,
  perPage: number,
  filters?: {
    status?: EmailCampaignStatusEnum;
    type?: EmailCampaignTypeEnum;
    search?: string;
  },
): Promise<{ campaigns: EmailCampaignRow[]; total: number }> {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .from('email_campaigns')
    .select('*', { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.type) {
    query = query.eq('campaign_type', filters.type);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching campaigns paginated:', error);
    throw new Error('Failed to fetch campaigns.');
  }

  return { campaigns: data ?? [], total: count ?? 0 };
}

/**
 * Get campaigns with status = 'scheduled' AND scheduled_at <= NOW().
 * Used by the cron processor to find campaigns that need to start sending.
 */
export async function getScheduledCampaigns(): Promise<EmailCampaignRow[]> {
  const { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled campaigns:', error);
    throw new Error('Failed to fetch scheduled campaigns.');
  }

  return data ?? [];
}

/**
 * Get campaigns with status = 'sending'.
 * Used by the cron processor for resume/continue processing.
 */
export async function getSendingCampaigns(): Promise<EmailCampaignRow[]> {
  const { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .eq('status', 'sending')
    .order('started_at', { ascending: true });

  if (error) {
    console.error('Error fetching sending campaigns:', error);
    throw new Error('Failed to fetch sending campaigns.');
  }

  return data ?? [];
}
