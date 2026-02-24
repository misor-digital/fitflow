/**
 * Email System Initialization
 *
 * Wires the DAL-backed callbacks into the Brevo wrapper layer.
 * Must be called once during app bootstrap (e.g. in middleware or layout).
 * Idempotent — safe to call multiple times.
 */

import 'server-only';
import { setOnEmailSentCallback } from '@/lib/email/brevo/transactional';
import { setUsageChecker } from '@/lib/email/usage';
import { logEmailSent } from './email-log';
import { canSendEmails } from './email-usage';

let initialized = false;

export function initializeEmailSystem(): void {
  if (initialized) return;

  // Wire send logging: every email sent through the Brevo wrapper gets logged
  setOnEmailSentCallback(async (log) => {
    await logEmailSent({
      email_type: log.emailType,
      email_category: log.emailCategory,
      recipient_email: log.recipientEmail,
      recipient_name: log.recipientName,
      subject: log.subject,
      template_id: log.templateId,
      brevo_message_id: log.brevoMessageId,
      campaign_id: log.campaignId,
      status: log.status,
      params: log.params,
      error: log.error,
      related_entity_type: log.relatedEntityType,
      related_entity_id: log.relatedEntityId,
    });
  });

  // Wire usage checker: monthly budget enforcement
  setUsageChecker(canSendEmails);

  initialized = true;
}
