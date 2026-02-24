/**
 * Email Send Log Data Access Layer
 *
 * Unified logging for all email sends (transactional + campaign).
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Read functions wrapped in React.cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
 * Used by admin dashboard.
 */
export const getEmailStats = cache(
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
  }> => {
    // Get total count
    let baseQuery = supabaseAdmin
      .from('email_send_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    const { count: total } = await baseQuery;

    // Get count by email_type
    const { count: transactional } = await supabaseAdmin
      .from('email_send_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .eq('email_type', 'transactional');

    const { count: campaign } = await supabaseAdmin
      .from('email_send_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .eq('email_type', 'campaign');

    // Get counts by status
    const statuses = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'] as const;

    const statusCounts = await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabaseAdmin
          .from('email_send_log')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo)
          .eq('status', status);

        return { status, count: count ?? 0 };
      }),
    );

    const statusMap: Record<string, number> = {};
    for (const { status, count } of statusCounts) {
      statusMap[status] = count;
    }

    return {
      total: total ?? 0,
      transactional: transactional ?? 0,
      campaign: campaign ?? 0,
      sent: statusMap.sent ?? 0,
      delivered: statusMap.delivered ?? 0,
      opened: statusMap.opened ?? 0,
      clicked: statusMap.clicked ?? 0,
      bounced: statusMap.bounced ?? 0,
      failed: statusMap.failed ?? 0,
    };
  },
);
