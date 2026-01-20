/**
 * Audit Logging Service
 * 
 * Server-side only service for creating immutable audit logs.
 * All critical internal actions should be logged for compliance and debugging.
 */

import { adminClient as supabase } from '@/lib/supabase';
import type { AuditLogInsert } from './types';
import { headers } from 'next/headers';

/**
 * Create an audit log entry
 * 
 * @param data - Audit log data
 * @returns The created audit log ID
 */
export async function createAuditLog(data: AuditLogInsert): Promise<string | null> {
  try {
    // Get IP address and user agent from request headers
    const headersList = await headers();
    const ipAddress = data.ip_address || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = data.user_agent || headersList.get('user-agent') || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabase as any).rpc('create_audit_log', {
      p_user_id: data.user_id,
      p_action: data.action,
      p_entity_type: data.entity_type,
      p_entity_id: data.entity_id || null,
      p_metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('Error creating audit log:', error);
      return null;
    }

    return result as string;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
}

/**
 * Log a campaign action
 */
export async function logCampaignAction(
  userId: string,
  action: string,
  campaignId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action,
    entity_type: 'campaign',
    entity_id: campaignId,
    metadata,
  });
}

/**
 * Log a follow-up action
 */
export async function logFollowUpAction(
  userId: string,
  action: string,
  followUpId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action,
    entity_type: 'follow_up',
    entity_id: followUpId,
    metadata,
  });
}

/**
 * Log a recipient action
 */
export async function logRecipientAction(
  userId: string,
  action: string,
  recipientId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action,
    entity_type: 'recipient',
    entity_id: recipientId,
    metadata,
  });
}

/**
 * Log a user action (login, logout, password change)
 */
export async function logUserAction(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action,
    entity_type: 'user',
    entity_id: userId,
    metadata,
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<unknown[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<unknown[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    return [];
  }
}
