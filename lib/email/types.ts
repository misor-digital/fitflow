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

// Discount data for emails
export interface EmailDiscountData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  description: string;
}

// Preorder-specific email data
export interface PreorderEmailData {
  fullName: string;
  email: string;
  boxType: string;
  boxTypeDisplay: string;
  wantsPersonalization: boolean;
  preorderId: string;
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
  // Discount info
  promoCode?: string;
  discount?: EmailDiscountData;
  originalPrice?: number;
  finalPrice?: number;
}
