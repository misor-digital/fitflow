/**
 * Subscription Lifecycle Email Notifications
 *
 * Fire-and-forget email helpers for subscription events.
 * Uses Brevo template emails — templates must be created in the Brevo dashboard.
 * All calls catch errors to prevent failures from blocking the main flow.
 */

import { sendTemplateEmail } from '@/lib/email';
import type { SubscriptionRow } from '@/lib/supabase/types';

/**
 * Brevo template IDs for subscription lifecycle notifications.
 * Update these after creating the templates in the Brevo dashboard.
 */
const SUBSCRIPTION_TEMPLATE_IDS = {
  created: Number(process.env.BREVO_SUB_CREATED_TEMPLATE_ID) || 0,
  paused: Number(process.env.BREVO_SUB_PAUSED_TEMPLATE_ID) || 0,
  resumed: Number(process.env.BREVO_SUB_RESUMED_TEMPLATE_ID) || 0,
  cancelled: Number(process.env.BREVO_SUB_CANCELLED_TEMPLATE_ID) || 0,
  deliveryUpcoming: Number(process.env.BREVO_DELIVERY_UPCOMING_TEMPLATE_ID) || 0,
} as const;

/**
 * Send email when a new subscription is created.
 */
export async function sendSubscriptionCreatedEmail(
  email: string,
  subscription: SubscriptionRow,
  nextDeliveryDate: string,
): Promise<void> {
  if (!SUBSCRIPTION_TEMPLATE_IDS.created) {
    console.warn('[EMAIL] Skipping subscription-created — template ID not configured');
    return;
  }

  try {
    await sendTemplateEmail({
      to: { email },
      templateId: SUBSCRIPTION_TEMPLATE_IDS.created,
      params: {
        boxType: subscription.box_type,
        frequency: subscription.frequency,
        nextDeliveryDate,
        manageUrl: 'https://fitflow.bg/account/subscriptions',
      },
      tags: ['subscription', 'created'],
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
  if (!SUBSCRIPTION_TEMPLATE_IDS.paused) {
    console.warn('[EMAIL] Skipping subscription-paused — template ID not configured');
    return;
  }

  try {
    await sendTemplateEmail({
      to: { email },
      templateId: SUBSCRIPTION_TEMPLATE_IDS.paused,
      params: {
        boxType: subscription.box_type,
        resumeUrl: 'https://fitflow.bg/account/subscriptions',
      },
      tags: ['subscription', 'paused'],
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
  if (!SUBSCRIPTION_TEMPLATE_IDS.resumed) {
    console.warn('[EMAIL] Skipping subscription-resumed — template ID not configured');
    return;
  }

  try {
    await sendTemplateEmail({
      to: { email },
      templateId: SUBSCRIPTION_TEMPLATE_IDS.resumed,
      params: {
        boxType: subscription.box_type,
        nextDeliveryDate,
        manageUrl: 'https://fitflow.bg/account/subscriptions',
      },
      tags: ['subscription', 'resumed'],
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
  if (!SUBSCRIPTION_TEMPLATE_IDS.cancelled) {
    console.warn('[EMAIL] Skipping subscription-cancelled — template ID not configured');
    return;
  }

  try {
    await sendTemplateEmail({
      to: { email },
      templateId: SUBSCRIPTION_TEMPLATE_IDS.cancelled,
      params: {
        boxType: subscription.box_type,
        resubscribeUrl: 'https://fitflow.bg/order',
      },
      tags: ['subscription', 'cancelled'],
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
  if (!SUBSCRIPTION_TEMPLATE_IDS.deliveryUpcoming) {
    console.warn('[EMAIL] Skipping delivery-upcoming — template ID not configured');
    return;
  }

  try {
    await sendTemplateEmail({
      to: { email },
      templateId: SUBSCRIPTION_TEMPLATE_IDS.deliveryUpcoming,
      params: {
        boxType: subscription.box_type,
        deliveryDate,
        trackUrl: `https://fitflow.bg/order/track?orderId=${orderId}`,
      },
      tags: ['subscription', 'delivery-upcoming'],
    });
  } catch (err) {
    console.error('[EMAIL] delivery-upcoming failed:', err);
  }
}
