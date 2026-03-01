/**
 * Subscription Lifecycle Email Notifications
 *
 * Fire-and-forget email helpers for subscription events.
 * Uses local code-controlled templates with the unified FitFlow design.
 * All calls catch errors to prevent failures from blocking the main flow.
 */

import { sendTransactionalEmail } from '@/lib/email/brevo';
import { resolveEmailLabels, FREQUENCY_LABELS } from '@/lib/email/labels';
import {
  generateSubscriptionCreatedEmail,
  generateSubscriptionPausedEmail,
  generateSubscriptionResumedEmail,
  generateSubscriptionCancelledEmail,
  generateDeliveryUpcomingEmail,
} from '@/lib/email/subscription-templates';
import type { SubscriptionRow } from '@/lib/supabase/types';

/**
 * Send email when a new subscription is created.
 */
export async function sendSubscriptionCreatedEmail(
  email: string,
  subscription: SubscriptionRow,
  nextDeliveryDate: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;
    const frequency = FREQUENCY_LABELS[subscription.frequency] ?? subscription.frequency;

    const htmlContent = generateSubscriptionCreatedEmail({
      boxTypeName,
      frequency,
      nextDeliveryDate,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow — Абонаментът ви е активиран!',
      htmlContent,
      tags: ['subscription', 'created'],
      category: 'sub-created',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-created failed:', err);
  }
}

/**
 * Send email when subscription is paused.
 */
export async function sendSubscriptionPausedEmail(
  email: string,
  subscription: SubscriptionRow,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateSubscriptionPausedEmail({
      boxTypeName,
      resumeUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow — Абонаментът ви е на пауза',
      htmlContent,
      tags: ['subscription', 'paused'],
      category: 'sub-paused',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-paused failed:', err);
  }
}

/**
 * Send email when subscription is resumed.
 */
export async function sendSubscriptionResumedEmail(
  email: string,
  subscription: SubscriptionRow,
  nextDeliveryDate: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateSubscriptionResumedEmail({
      boxTypeName,
      nextDeliveryDate,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow — Абонаментът ви е възобновен',
      htmlContent,
      tags: ['subscription', 'resumed'],
      category: 'sub-resumed',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-resumed failed:', err);
  }
}

/**
 * Send email when subscription is cancelled.
 */
export async function sendSubscriptionCancelledEmail(
  email: string,
  subscription: SubscriptionRow,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateSubscriptionCancelledEmail({
      boxTypeName,
      resubscribeUrl: 'https://fitflow.bg/order',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow — Абонаментът ви е отменен',
      htmlContent,
      tags: ['subscription', 'cancelled'],
      category: 'sub-cancelled',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-cancelled failed:', err);
  }
}

/**
 * Send email when an order is generated for a subscription (upcoming delivery).
 */
export async function sendDeliveryUpcomingEmail(
  email: string,
  subscription: SubscriptionRow,
  deliveryDate: string,
  orderId: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateDeliveryUpcomingEmail({
      boxTypeName,
      deliveryDate,
      trackUrl: `https://fitflow.bg/order/track?orderId=${orderId}`,
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow — Доставката ви наближава!',
      htmlContent,
      tags: ['subscription', 'delivery-upcoming'],
      category: 'delivery-upcoming',
      relatedEntityType: 'order',
      relatedEntityId: orderId,
    });
  } catch (err) {
    console.error('[EMAIL] delivery-upcoming failed:', err);
  }
}
