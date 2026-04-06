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
  generateFrequencyChangedEmail,
  generateAddressChangedEmail,
  generatePreferencesUpdatedEmail,
} from '@/lib/email/subscription-templates';
import {
  generateSubscriptionConversionEmail,
  SUBSCRIPTION_CONVERSION_SUBJECT,
  type SubscriptionConversionEmailData,
} from '@/lib/email/order-subscription-conversion-email';
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
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      frequency,
      nextDeliveryDate,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Абонаментът ти е активиран!',
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
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      resumeUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Абонаментът ти е на пауза',
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
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      nextDeliveryDate,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Абонаментът ти е възобновен',
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
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      resubscribeUrl: 'https://fitflow.bg/order',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Абонаментът ти е отменен',
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
  orderNumber: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateDeliveryUpcomingEmail({
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      orderNumber,
      deliveryDate,
      trackUrl: `https://fitflow.bg/order/track?orderId=${orderId}`,
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Доставката ти наближава!',
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

/**
 * Send combined subscription-conversion + optional account-setup email.
 */
export async function sendSubscriptionConversionEmail(
  data: SubscriptionConversionEmailData & { subscriptionId: string },
): Promise<void> {
  try {
    const htmlContent = generateSubscriptionConversionEmail(data);

    await sendTransactionalEmail({
      to: { email: data.email, name: data.fullName },
      subject: SUBSCRIPTION_CONVERSION_SUBJECT,
      htmlContent,
      tags: ['subscription', 'order-conversion'],
      category: 'subscription-conversion',
      relatedEntityType: 'subscription',
      relatedEntityId: data.subscriptionId,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-conversion failed:', err);
  }
}

/**
 * Send email when subscription frequency changes.
 */
export async function sendSubscriptionFrequencyChangedEmail(
  email: string,
  subscription: SubscriptionRow,
  oldFrequency: string,
  newFrequency: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateFrequencyChangedEmail({
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      oldFrequency: FREQUENCY_LABELS[oldFrequency] ?? oldFrequency,
      newFrequency: FREQUENCY_LABELS[newFrequency] ?? newFrequency,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Честотата на абонамента ти е променена',
      htmlContent,
      tags: ['subscription', 'frequency-changed'],
      category: 'sub-frequency-changed',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-frequency-changed failed:', err);
  }
}

/**
 * Send email when subscription delivery address changes.
 */
export async function sendSubscriptionAddressChangedEmail(
  email: string,
  subscription: SubscriptionRow,
  oldAddress: string,
  newAddress: string,
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generateAddressChangedEmail({
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      oldAddress,
      newAddress,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Адресът на абонамента ти е променен',
      htmlContent,
      tags: ['subscription', 'address-changed'],
      category: 'sub-address-changed',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-address-changed failed:', err);
  }
}

/**
 * Send email when subscription personalization preferences are updated.
 */
export async function sendSubscriptionPreferencesUpdatedEmail(
  email: string,
  subscription: SubscriptionRow,
  summaryLines: string[],
): Promise<void> {
  try {
    const labels = await resolveEmailLabels();
    const boxTypeName = labels.boxTypes[subscription.box_type] ?? subscription.box_type;

    const htmlContent = generatePreferencesUpdatedEmail({
      subscriptionNumber: subscription.subscription_number,
      boxTypeName,
      summaryLines,
      manageUrl: 'https://fitflow.bg/account/subscriptions',
    });

    await sendTransactionalEmail({
      to: { email },
      subject: 'FitFlow - Предпочитанията на абонамента ти са обновени',
      htmlContent,
      tags: ['subscription', 'preferences-updated'],
      category: 'sub-preferences-updated',
      relatedEntityType: 'subscription',
      relatedEntityId: subscription.id,
    });
  } catch (err) {
    console.error('[EMAIL] subscription-preferences-updated failed:', err);
  }
}

/**
 * Produce human-readable summary lines for preference changes.
 * Only includes fields that actually changed.
 */
export function formatPreferencesSummary(
  oldPrefs: Record<string, unknown>,
  newPrefs: Record<string, unknown>,
): string[] {
  const lines: string[] = [];
  const labelMap: Record<string, string> = {
    sports: '🏃 Спортове',
    colors: '🎨 Цветове',
    flavors: '🍫 Вкусове',
    dietary: '🥗 Диета',
    size_upper: '👕 Размер горе',
    size_lower: '👖 Размер долу',
    additional_notes: '📝 Бележки',
  };

  for (const [key, label] of Object.entries(labelMap)) {
    const oldVal = oldPrefs[key];
    const newVal = newPrefs[key];
    const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal ?? '—');
    const newStr = Array.isArray(newVal) ? newVal.join(', ') : String(newVal ?? '—');
    if (oldStr !== newStr) {
      lines.push(`${label}: ${oldStr} → ${newStr}`);
    }
  }

  return lines.length > 0 ? lines : ['Предпочитанията са обновени'];
}
