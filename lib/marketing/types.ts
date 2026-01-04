/**
 * Marketing campaign types
 */

// ============================================================================
// Enums
// ============================================================================

export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type SendStatus = 
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'bounced';

// ============================================================================
// Marketing Campaigns
// ============================================================================

export interface MarketingCampaignRow {
  id: string;
  name: string;
  subject: string;
  template: string;
  preview_text: string | null;
  scheduled_start_at: string | null;
  status: CampaignStatus;
  recipient_filter: RecipientFilter | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MarketingCampaignInsert {
  name: string;
  subject: string;
  template: string;
  preview_text?: string | null;
  scheduled_start_at?: string | null;
  status?: CampaignStatus;
  recipient_filter?: RecipientFilter | null;
}

export interface MarketingCampaignUpdate {
  name?: string;
  subject?: string;
  template?: string;
  preview_text?: string | null;
  scheduled_start_at?: string | null;
  status?: CampaignStatus;
  recipient_filter?: RecipientFilter | null;
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  skipped_count?: number;
  locked_by?: string | null;
  locked_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

// ============================================================================
// Marketing Recipients
// ============================================================================

export interface MarketingRecipientRow {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  subscribed: boolean;
  unsubscribed_at: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingRecipientInsert {
  email: string;
  name?: string | null;
  tags?: string[];
  subscribed?: boolean;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MarketingRecipientUpdate {
  email?: string;
  name?: string | null;
  tags?: string[];
  subscribed?: boolean;
  unsubscribed_at?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// Marketing Sends
// ============================================================================

export interface MarketingSendRow {
  id: string;
  campaign_id: string;
  recipient_id: string | null;
  email: string;
  status: SendStatus;
  provider_message_id: string | null;
  error: string | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface MarketingSendInsert {
  campaign_id: string;
  recipient_id?: string | null;
  email: string;
  status?: SendStatus;
  max_attempts?: number;
}

export interface MarketingSendUpdate {
  status?: SendStatus;
  provider_message_id?: string | null;
  error?: string | null;
  attempt_count?: number;
  next_retry_at?: string | null;
  sent_at?: string | null;
}

// ============================================================================
// Recipient Filter
// ============================================================================

export interface RecipientFilter {
  tags?: string[];           // Recipients must have ALL these tags
  tagsAny?: string[];        // Recipients must have ANY of these tags
  excludeTags?: string[];    // Recipients must NOT have these tags
  subscribedOnly?: boolean;  // Only subscribed recipients (default: true)
}

// ============================================================================
// Campaign Progress
// ============================================================================

export interface CampaignProgress {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
  bounced: number;
  progress_percent: number;
}

// ============================================================================
// Template Variables
// ============================================================================

export interface TemplateVariables {
  email: string;
  name?: string;
  unsubscribe_url?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Runner Configuration
// ============================================================================

export interface CampaignRunnerConfig {
  /** Batch size for fetching sends */
  batchSize: number;
  /** Delay between batches in ms (for rate limiting) */
  batchDelayMs: number;
  /** Delay between individual sends in ms */
  sendDelayMs: number;
  /** Lock timeout in minutes */
  lockTimeoutMinutes: number;
  /** Max retry attempts for failed sends */
  maxRetryAttempts: number;
  /** Base delay for exponential backoff in ms */
  retryBaseDelayMs: number;
  /** Dry-run mode - no emails sent, sends marked as skipped */
  dryRun: boolean;
}

export const DEFAULT_RUNNER_CONFIG: CampaignRunnerConfig = {
  batchSize: 50,
  batchDelayMs: 1000,
  sendDelayMs: 100,
  lockTimeoutMinutes: 10,
  maxRetryAttempts: 3,
  retryBaseDelayMs: 60000, // 1 minute
  dryRun: false,
};

// ============================================================================
// Campaign Rate Limits (per-campaign overrides)
// ============================================================================

export interface CampaignRateLimits {
  /** Max emails per batch (overrides runner config) */
  maxPerBatch?: number;
  /** Delay between batches in ms (overrides runner config) */
  batchDelayMs?: number;
  /** Delay between individual sends in ms */
  sendDelayMs?: number;
}
