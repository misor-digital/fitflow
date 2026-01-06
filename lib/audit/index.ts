/**
 * Audit logging service
 * 
 * Provides immutable audit logging for tracking admin actions.
 * All logs are append-only and cannot be modified or deleted.
 */

import { supabase } from '@/lib/supabase/client';

export type AuditAction =
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.start'
  | 'campaign.pause'
  | 'campaign.resume'
  | 'campaign.cancel'
  | 'follow_up.create'
  | 'recipient.create'
  | 'recipient.update'
  | 'recipient.delete'
  | 'user.login'
  | 'user.logout';

export type EntityType = 'campaign' | 'follow_up' | 'recipient' | 'user';

export interface AuditLogEntry {
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 * This is an append-only operation - logs cannot be modified or deleted
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('audit_log')
      .insert({
        user_id: entry.userId,
        user_email: entry.userEmail,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        metadata: entry.metadata || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error logging audit event:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Log a campaign action
 */
export async function logCampaignAction(
  userId: string,
  userEmail: string,
  action: 'campaign.create' | 'campaign.update' | 'campaign.start' | 'campaign.pause' | 'campaign.resume' | 'campaign.cancel',
  campaignId: string,
  metadata?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail,
    action,
    entityType: 'campaign',
    entityId: campaignId,
    metadata,
    ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Log a follow-up campaign creation
 */
export async function logFollowUpCreation(
  userId: string,
  userEmail: string,
  followUpId: string,
  parentCampaignId: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    userEmail,
    action: 'follow_up.create',
    entityType: 'follow_up',
    entityId: followUpId,
    metadata: { parentCampaignId },
    ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogsForEntity(
  entityType: EntityType,
  entityId: string,
  limit = 50
): Promise<{ data: unknown[] | null; error: string | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(
  limit = 100
): Promise<{ data: unknown[] | null; error: string | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
