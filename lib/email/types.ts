/**
 * Email service types for Brevo integration
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  email: string;
  name: string;
}

export interface EmailAttachment {
  name: string;
  content: string; // Base64 encoded content
  contentType?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  sender?: EmailSender;
  replyTo?: EmailRecipient;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: EmailAttachment[];
  tags?: string[];
  params?: Record<string, string | number | boolean>;
}

export interface SendTemplateEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  templateId: number;
  params?: Record<string, string | number | boolean | string[]>;
  sender?: EmailSender;
  replyTo?: EmailRecipient;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: EmailAttachment[];
  tags?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
  listIds?: number[];
  updateEnabled?: boolean;
}

export interface ContactResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

// Confirmation email data (shared by all confirmation emails)
export interface ConfirmationEmailData {
  fullName: string;
  email: string;
  boxType: string;
  boxTypeDisplay: string;
  wantsPersonalization: boolean;
  /** Human-readable order number (e.g. FF-201224-A7K2) */
  orderId: string;
  sports?: string[];
  sportOther?: string;
  colors?: string[];
  flavors?: string[];
  flavorOther?: string;
  sizeUpper?: string;
  sizeLower?: string;
  dietary?: string[];
  dietaryOther?: string;
  additionalNotes?: string;
  // Promo code fields
  hasPromoCode: boolean;
  promoCode?: string | null;
  discountPercent?: number | null;
  // Price fields
  originalPriceEur?: number | null;
  finalPriceEur?: number | null;
  discountAmountEur?: number | null;
  originalPriceBgn?: number | null;
  finalPriceBgn?: number | null;
  discountAmountBgn?: number | null;
}

// ============================================================================
// Email Campaign Types
// ============================================================================

export type EmailCampaignType = 'one-off' | 'preorder-conversion' | 'promotional' | 'lifecycle';

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';

export type EmailRecipientStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'skipped';

export type EmailLogStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export type EmailLogType = 'transactional' | 'campaign';

export type TargetListType = 'preorder-holders' | 'subscribers' | 'all-customers' | 'custom-list';

/** Input for the email_send_log table */
export interface EmailSendLogInput {
  emailType: EmailLogType;
  emailCategory: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  templateId: number | null;
  brevoMessageId: string | null;
  campaignId: string | null;
  status: EmailLogStatus;
  params: Record<string, unknown> | null;
  error: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

/** Campaign history action types */
export type CampaignHistoryAction =
  | 'created'
  | 'updated'
  | 'scheduled'
  | 'started'
  | 'paused'
  | 'resumed'
  | 'cancelled'
  | 'completed'
  | 'failed';
