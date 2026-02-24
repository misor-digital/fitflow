/**
 * Brevo Transactional Email Wrapper
 *
 * Higher-level wrapper around emailService.sendEmail/sendTemplateEmail
 * that adds structured logging hooks and usage tracking.
 */

import { sendEmail, sendTemplateEmail } from '../emailService';
import type { SendEmailOptions, SendTemplateEmailOptions, EmailResult } from '../types';
import type { EmailSendLogInput } from '../types';

/** Callback type for send logging — injected by the DAL layer (Phase E2) */
export type OnEmailSent = (log: EmailSendLogInput) => Promise<void>;

/** Module-level logging callback — set once during app bootstrap */
let onEmailSentCallback: OnEmailSent | null = null;

export function setOnEmailSentCallback(cb: OnEmailSent): void {
  onEmailSentCallback = cb;
}

/**
 * Send a transactional email with HTML content + log it
 */
export async function sendTransactionalEmail(
  options: SendEmailOptions & {
    category: string;           // e.g. 'order-confirmation', 'sub-created'
    relatedEntityType?: string; // e.g. 'order', 'subscription'
    relatedEntityId?: string;   // UUID of related entity
  }
): Promise<EmailResult> {
  const result = await sendEmail(options);

  // Fire-and-forget logging
  if (onEmailSentCallback) {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const recipient of recipients) {
      onEmailSentCallback({
        emailType: 'transactional',
        emailCategory: options.category,
        recipientEmail: recipient.email,
        recipientName: recipient.name ?? null,
        subject: options.subject,
        templateId: null,
        brevoMessageId: result.messageId ?? null,
        campaignId: null,
        status: result.success ? 'sent' : 'failed',
        params: options.params ?? null,
        error: result.error ?? null,
        relatedEntityType: options.relatedEntityType ?? null,
        relatedEntityId: options.relatedEntityId ?? null,
      }).catch((err) => console.error('Failed to log email send:', err));
    }
  }

  return result;
}

/**
 * Send a transactional email using a Brevo template + log it
 */
export async function sendTransactionalTemplateEmail(
  options: SendTemplateEmailOptions & {
    category: string;
    subject?: string;           // For logging — Brevo templates have their own subjects
    relatedEntityType?: string;
    relatedEntityId?: string;
  }
): Promise<EmailResult> {
  const result = await sendTemplateEmail(options);

  if (onEmailSentCallback) {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const recipient of recipients) {
      onEmailSentCallback({
        emailType: 'transactional',
        emailCategory: options.category,
        recipientEmail: recipient.email,
        recipientName: recipient.name ?? null,
        subject: options.subject ?? null,
        templateId: options.templateId,
        brevoMessageId: result.messageId ?? null,
        campaignId: null,
        status: result.success ? 'sent' : 'failed',
        params: options.params ?? null,
        error: result.error ?? null,
        relatedEntityType: options.relatedEntityType ?? null,
        relatedEntityId: options.relatedEntityId ?? null,
      }).catch((err) => console.error('Failed to log email send:', err));
    }
  }

  return result;
}
