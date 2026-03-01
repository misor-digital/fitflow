/**
 * Email Send Log Data Access Layer
 *
 * Unified logging for all email sends (transactional + campaign).
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TAG_EMAIL_STATS } from './cache-tags';
import type {
  EmailSendLogRow,
  EmailSendLogInsert,
  EmailLogStatusEnum,
} from '@/lib/supabase/types';

// ============================================================================
// Write operations
// ============================================================================

/**
 * Insert a send log row.
 * Fire-and-forget — errors are logged to console, never thrown.
 * This ensures email sending never fails due to logging issues.
 */
export async function logEmailSent(data: EmailSendLogInsert): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('email_send_log')
      .insert(data);

    if (error) {
      console.error('Error logging email send:', error);
    }
  } catch (err) {
    console.error('Unexpected error logging email send:', err);
  }
}

/**
 * Update log entry status by Brevo message ID.
 * Used by webhook handler for delivery/open/click/bounce events.
 */
export async function updateEmailLogStatus(
  brevoMessageId: string,
  status: EmailLogStatusEnum,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_send_log')
    .update({ status })
    .eq('brevo_message_id', brevoMessageId);

  if (error) {
    console.error('Error updating email log status:', error);
    throw new Error('Failed to update email log status.');
  }
}

/**
 * Update email log entry from a Brevo webhook event.
 * Idempotent — only updates if the event provides new information.
 * Appends the raw event to the webhook_events audit trail.
 */
export async function updateEmailLogFromWebhook(
  brevoMessageId: string,
  event: string,
  eventData: {
    date?: string;
    reason?: string;
    link?: string;
    rawEvent?: Record<string, unknown>;
  },
): Promise<{ campaignId: string | null; recipientEmail: string | null }> {
  // Fetch current log entry
  const { data: logEntry, error: fetchError } = await supabaseAdmin
    .from('email_send_log')
    .select('id, status, delivered_at, opened_at, clicked_at, unsubscribed_at, webhook_events, campaign_id, recipient_email')
    .eq('brevo_message_id', brevoMessageId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching email log for webhook:', fetchError);
    throw new Error('Failed to fetch email log entry.');
  }

  if (!logEntry) {
    // No matching log entry — skip silently (message may not be tracked)
    return { campaignId: null, recipientEmail: null };
  }

  // Build update payload based on event type
  const update: Record<string, unknown> = {};
  const eventTimestamp = eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString();

  switch (event) {
    case 'delivered':
      update.status = 'delivered';
      if (!logEntry.delivered_at) {
        update.delivered_at = eventTimestamp;
      }
      break;
    case 'soft_bounce':
    case 'hard_bounce':
      update.status = 'bounced';
      if (eventData.reason) {
        update.error = eventData.reason;
      }
      break;
    case 'opened':
      // Only update status to opened if not already clicked
      if (logEntry.status !== 'clicked') {
        update.status = 'opened';
      }
      if (!logEntry.opened_at) {
        update.opened_at = eventTimestamp;
      }
      break;
    case 'clicked':
      update.status = 'clicked';
      if (!logEntry.clicked_at) {
        update.clicked_at = eventTimestamp;
      }
      break;
    case 'spam':
      update.status = 'spam';
      break;
    case 'unsubscribed':
      if (!logEntry.unsubscribed_at) {
        update.unsubscribed_at = eventTimestamp;
      }
      break;
    case 'blocked':
      update.status = 'blocked';
      if (eventData.reason) {
        update.error = eventData.reason;
      }
      break;
    default:
      // Unknown event — just append to audit trail
      break;
  }

  // Append raw event to webhook_events audit trail
  const existingEvents = Array.isArray(logEntry.webhook_events) ? logEntry.webhook_events : [];
  update.webhook_events = [
    ...existingEvents,
    {
      event,
      timestamp: eventTimestamp,
      ...(eventData.reason && { reason: eventData.reason }),
      ...(eventData.link && { link: eventData.link }),
    },
  ];

  const { error: updateError } = await supabaseAdmin
    .from('email_send_log')
    .update(update)
    .eq('id', logEntry.id);

  if (updateError) {
    console.error('Error updating email log from webhook:', updateError);
    throw new Error('Failed to update email log from webhook.');
  }

  return {
    campaignId: logEntry.campaign_id ?? null,
    recipientEmail: logEntry.recipient_email ?? null,
  };
}

// ============================================================================
// Read operations (cached)
// ============================================================================

/**
 * Paginated email log with filters.
 * Order by created_at DESC.
 */
export const getEmailLog = cache(
  async (filters: {
    dateFrom?: string;
    dateTo?: string;
    emailType?: 'transactional' | 'campaign';
    category?: string;
    status?: EmailLogStatusEnum;
    recipientEmail?: string;
    page: number;
    perPage: number;
  }): Promise<{ logs: EmailSendLogRow[]; total: number }> => {
    const from = (filters.page - 1) * filters.perPage;
    const to = from + filters.perPage - 1;

    let query = supabaseAdmin
      .from('email_send_log')
      .select('*', { count: 'exact' });

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.emailType) {
      query = query.eq('email_type', filters.emailType);
    }
    if (filters.category) {
      query = query.eq('email_category', filters.category);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.recipientEmail) {
      query = query.ilike('recipient_email', `%${filters.recipientEmail}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching email log:', error);
      throw new Error('Failed to fetch email log.');
    }

    return { logs: data ?? [], total: count ?? 0 };
  },
);

/**
 * Get all emails related to a specific entity (e.g. all emails for order X).
 */
export const getEmailLogByEntity = cache(
  async (
    entityType: string,
    entityId: string,
  ): Promise<EmailSendLogRow[]> => {
    const { data, error } = await supabaseAdmin
      .from('email_send_log')
      .select('*')
      .eq('related_entity_type', entityType)
      .eq('related_entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email log by entity:', error);
      throw new Error('Failed to fetch email log by entity.');
    }

    return data ?? [];
  },
);

/**
 * Aggregate stats for a date range.
 * Uses webhook-enriched columns for accurate delivery/open/click tracking.
 * Used by admin dashboard.
 */
export const getEmailStats = cache(
  async (
    dateFrom: string,
    dateTo: string,
  ) => _getEmailStatsInner(dateFrom, dateTo),
);

const _getEmailStatsInner = unstable_cache(
  async (
    dateFrom: string,
    dateTo: string,
  ): Promise<{
    total: number;
    transactional: number;
    campaign: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    spam: number;
    blocked: number;
  }> => {
    // Fetch all counts in parallel for efficiency
    const makeQuery = (extra?: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>) => {
      let q = supabaseAdmin
        .from('email_send_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);
      if (extra) q = extra(q) as typeof q;
      return q;
    };

    const [
      { count: total },
      { count: transactional },
      { count: campaign },
      { count: sent },
      { count: delivered },
      { count: bounced },
      { count: failed },
      { count: spam },
      { count: blocked },
    ] = await Promise.all([
      makeQuery(),
      makeQuery(q => q.eq('email_type', 'transactional')),
      makeQuery(q => q.eq('email_type', 'campaign')),
      makeQuery(q => q.eq('status', 'sent')),
      makeQuery(q => q.eq('status', 'delivered')),
      makeQuery(q => q.eq('status', 'bounced')),
      makeQuery(q => q.eq('status', 'failed')),
      makeQuery(q => q.eq('status', 'spam')),
      makeQuery(q => q.eq('status', 'blocked')),
    ]);

    // Count opened/clicked from webhook timestamp columns (more accurate)
    const [
      { count: opened },
      { count: clicked },
    ] = await Promise.all([
      supabaseAdmin
        .from('email_send_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .not('opened_at', 'is', null),
      supabaseAdmin
        .from('email_send_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .not('clicked_at', 'is', null),
    ]);

    return {
      total: total ?? 0,
      transactional: transactional ?? 0,
      campaign: campaign ?? 0,
      sent: sent ?? 0,
      delivered: delivered ?? 0,
      opened: opened ?? 0,
      clicked: clicked ?? 0,
      bounced: bounced ?? 0,
      failed: failed ?? 0,
      spam: spam ?? 0,
      blocked: blocked ?? 0,
    };
  },
  ['email-stats'],
  { revalidate: 60, tags: [TAG_EMAIL_STATS] },
);
