/**
 * Cron Notification Helpers
 *
 * Email notifications for automated order generation results.
 * Uses Brevo template emails — templates must be created in the Brevo dashboard.
 */

import { sendTransactionalTemplateEmail } from '@/lib/email/brevo';
import type { GenerationResult } from './generate';

const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_EMAIL || 'admin@fitflow.bg';

/**
 * Brevo template IDs for cron notifications.
 * Update these after creating the templates in the Brevo dashboard.
 */
const CRON_TEMPLATE_IDS = {
  success: Number(process.env.BREVO_CRON_SUCCESS_TEMPLATE_ID) || 0,
  errors: Number(process.env.BREVO_CRON_ERRORS_TEMPLATE_ID) || 0,
  failure: Number(process.env.BREVO_CRON_FAILURE_TEMPLATE_ID) || 0,
} as const;

/**
 * Send email when cron generation has partial errors (some orders failed).
 */
export async function sendCronErrorNotification(result: GenerationResult): Promise<void> {
  if (!CRON_TEMPLATE_IDS.errors) {
    console.warn('[CRON] Skipping error notification — BREVO_CRON_ERRORS_TEMPLATE_ID not configured');
    return;
  }

  try {
    await sendTransactionalTemplateEmail({
      to: { email: ADMIN_NOTIFICATION_EMAIL },
      templateId: CRON_TEMPLATE_IDS.errors,
      params: {
        cycleId: result.cycleId ?? '',
        cycleDate: result.cycleDate ?? '',
        generated: result.generated,
        errors: result.errors,
        errorDetails: result.errorDetails
          .map((e) => `• ${e.subscriptionId}: ${e.error}`)
          .join('\n'),
        timestamp: new Date().toISOString(),
      },
      tags: ['cron', 'order-generation', 'errors'],
      category: 'cron-errors',
    });
  } catch (emailError) {
    // Don't let email failure cascade — just log it
    console.error('[CRON] Failed to send error notification email:', emailError);
  }
}

/**
 * Send summary email on successful generation.
 */
export async function sendCronSuccessNotification(result: GenerationResult): Promise<void> {
  if (!CRON_TEMPLATE_IDS.success) {
    console.warn('[CRON] Skipping success notification — BREVO_CRON_SUCCESS_TEMPLATE_ID not configured');
    return;
  }

  try {
    await sendTransactionalTemplateEmail({
      to: { email: ADMIN_NOTIFICATION_EMAIL },
      templateId: CRON_TEMPLATE_IDS.success,
      params: {
        cycleId: result.cycleId ?? '',
        cycleDate: result.cycleDate ?? '',
        generated: result.generated,
        skipped: result.skipped,
        excluded: result.excluded,
        timestamp: new Date().toISOString(),
      },
      tags: ['cron', 'order-generation', 'success'],
      category: 'cron-success',
    });
  } catch (emailError) {
    console.error('[CRON] Failed to send success notification email:', emailError);
  }
}

/**
 * Send email when the cron job itself fails completely.
 */
export async function sendCronFailureNotification(error: unknown): Promise<void> {
  if (!CRON_TEMPLATE_IDS.failure) {
    console.warn('[CRON] Skipping failure notification — BREVO_CRON_FAILURE_TEMPLATE_ID not configured');
    return;
  }

  try {
    await sendTransactionalTemplateEmail({
      to: { email: ADMIN_NOTIFICATION_EMAIL },
      templateId: CRON_TEMPLATE_IDS.failure,
      params: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      tags: ['cron', 'order-generation', 'failure'],
      category: 'cron-failure',
    });
  } catch (emailError) {
    console.error('[CRON] Failed to send failure notification email:', emailError);
  }
}
