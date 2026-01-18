/**
 * Audit Logging Types
 */

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Audit log insert data
 */
export interface AuditLogInsert {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Audit action types for campaigns
 */
export const AUDIT_ACTIONS = {
  // Campaign actions
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_UPDATE: 'campaign.update',
  CAMPAIGN_START: 'campaign.start',
  CAMPAIGN_PAUSE: 'campaign.pause',
  CAMPAIGN_RESUME: 'campaign.resume',
  CAMPAIGN_CANCEL: 'campaign.cancel',
  
  // Follow-up actions
  FOLLOW_UP_CREATE: 'follow_up.create',
  FOLLOW_UP_POPULATE: 'follow_up.populate',
  
  // Recipient actions
  RECIPIENT_CREATE: 'recipient.create',
  RECIPIENT_UPDATE: 'recipient.update',
  RECIPIENT_IMPORT: 'recipient.import',
  RECIPIENT_UNSUBSCRIBE: 'recipient.unsubscribe',
  
  // Auth actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGE: 'user.password_change',
} as const;

/**
 * Entity types for audit logs
 */
export const ENTITY_TYPES = {
  CAMPAIGN: 'campaign',
  FOLLOW_UP: 'follow_up',
  RECIPIENT: 'recipient',
  USER: 'user',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
