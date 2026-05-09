/**
 * GET /api/admin/email-preview?template=<key>
 *
 * Returns a raw HTML email for preview purposes.
 * Requires staff authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { resolveEmailLabels } from '@/lib/email/labels';
import {
  generateConfirmationEmail,
  generateCustomerInviteEmail,
  generateStaffInviteEmail,
  generateMagicRegistrationEmail,
  generateMagicLinkLoginEmail,
  generateEmailConfirmationEmail,
  generatePasswordResetEmail,
  generateOtpVerificationEmail,
  generateDeliveryReminderEmail,
  generateDeliveryAutoConfirmedEmail,
  generateProfileUpdatedEmail,
  generateAccountDeletedEmail,
} from '@/lib/email/templates';
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
} from '@/lib/email/order-subscription-conversion-email';

const PREVIEW_ROLES = ['super_admin', 'admin', 'marketing', 'content'] as const;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_MANAGE_URL = 'https://fitflow.bg/account/subscriptions';
const SAMPLE_TRACK_URL = 'https://fitflow.bg/order/track';
const SAMPLE_SETUP_URL = 'https://fitflow.bg/setup-password?token=preview';
const SAMPLE_LOGIN_URL = 'https://fitflow.bg/login?token=preview';
const SAMPLE_CONFIRM_URL = 'https://fitflow.bg/order/confirm?token=preview';
const SAMPLE_REPORT_URL = 'https://fitflow.bg/contact';
const SAMPLE_DELIVERY_DATE = '2026-06-08';
const SAMPLE_SUB_NUMBER = 'FF-SUB-2026-0042';
const SAMPLE_ORDER_NUMBER = 'FF-010526-A7K2';

export async function GET(request: NextRequest) {
  await requireStaff([...PREVIEW_ROLES]);

  const template = request.nextUrl.searchParams.get('template') ?? '';
  const labels = await resolveEmailLabels();

  let html: string;

  try {
    switch (template) {
    // -----------------------------------------------------------------------
    // Order confirmation
    // -----------------------------------------------------------------------
    case 'order-confirmation':
      html = generateConfirmationEmail(
        {
          firstName: 'Мария',
          lastName: 'Иванова',
          email: 'maria@example.com',
          boxType: 'sport',
          boxTypeDisplay: 'Sport кутия',
          wantsPersonalization: true,
          orderId: SAMPLE_ORDER_NUMBER,
          sports: ['running', 'yoga'],
          colors: ['blue', 'black'],
          flavors: ['chocolate', 'vanilla'],
          sizeUpper: 'M',
          sizeLower: 'S',
          dietary: ['vegan'],
          additionalNotes: 'Без глутен, ако е възможно.',
          hasPromoCode: true,
          promoCode: 'WELCOME10',
          discountPercent: 10,
          originalPriceEur: 45,
          finalPriceEur: 40.5,
          discountAmountEur: 4.5,
          originalPriceBgn: 87.99,
          finalPriceBgn: 79.19,
          discountAmountBgn: 8.8,
          deliveryMethod: 'address',
          deliveryFeeEur: 4.99,
          deliveryCycleName: 'Юни 2026 кутия',
          deliveryDate: SAMPLE_DELIVERY_DATE,
          shippingAddress: {
            firstName: 'Мария',
            lastName: 'Иванова',
            phone: '+359 88 123 4567',
            city: 'София',
            postalCode: '1000',
            streetAddress: 'ул. Витоша 42',
            buildingEntrance: 'A',
            floor: '3',
            apartment: '12',
            deliveryNotes: null,
          },
        },
        'order',
        labels,
      );
      break;

    // -----------------------------------------------------------------------
    // Order confirmation – no personalization, no promo
    // -----------------------------------------------------------------------
    case 'order-confirmation-simple':
      html = generateConfirmationEmail(
        {
          firstName: 'Петър',
          lastName: 'Георгиев',
          email: 'petar@example.com',
          boxType: 'wellness',
          boxTypeDisplay: 'Wellness кутия',
          wantsPersonalization: false,
          orderId: 'FF-010526-B3X9',
          hasPromoCode: false,
          originalPriceEur: 39,
          finalPriceEur: 39,
          originalPriceBgn: 76.27,
          finalPriceBgn: 76.27,
          deliveryMethod: 'speedy_office',
          deliveryFeeEur: 0,
          deliveryCycleName: 'Юни 2026 кутия',
          deliveryDate: SAMPLE_DELIVERY_DATE,
          speedyOfficeName: 'Speedy – клон Люлин',
          speedyOfficeAddress: 'бул. Добринова скала 2, ет. 1',
          shippingAddress: {
            firstName: 'Петър',
            lastName: 'Георгиев',
            phone: '+359 87 654 3210',
            city: null,
            postalCode: null,
            streetAddress: null,
            buildingEntrance: null,
            floor: null,
            apartment: null,
            deliveryNotes: null,
          },
        },
        'order',
        labels,
      );
      break;

    // -----------------------------------------------------------------------
    // Subscription created
    // -----------------------------------------------------------------------
    case 'sub-created':
      html = generateSubscriptionCreatedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        frequency: 'Месечна',
        nextDeliveryDate: '08.06.2026',
        deliveryCycleName: 'Юни 2026 кутия',
        personalizationLines: [
          'Спортове: Бягане, Йога',
          'Цветове: Синьо, Черно',
          'Вкусове: Шоколад, Ванилия',
          'Размер (горна): M',
          'Размер (долна): S',
        ],
        delivery: {
          deliveryMethod: 'speedy_automat',
          speedyOfficeName: 'Speedy автомат – Мол Люлин 2',
          speedyOfficeAddress: 'бул. Добринова скала 2, вход A, 1336 София',
          deliveryDate: '08.06.2026',
          deliveryFeeLabel: '4.99 € / 9.76 лв.',
          recipientName: 'Мария Иванова',
          recipientPhone: '+359 88 123 4567',
        },
        manageUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Subscription conversion
    // -----------------------------------------------------------------------
    case 'sub-conversion':
      html = generateSubscriptionConversionEmail({
        firstName: 'Мария',
        lastName: 'Иванова',
        email: 'maria@example.com',
        boxType: 'sport',
        boxName: 'Sport кутия',
        frequency: 'monthly',
        frequencyLabel: 'Месечна',
        basePriceEur: 45,
        currentPriceEur: 40.5,
        basePriceBgn: 87.99,
        currentPriceBgn: 79.19,
        promoCode: 'WELCOME10',
        discountPercent: 10,
        nextDeliveryDate: '08.06.2026',
        orderNumber: SAMPLE_ORDER_NUMBER,
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        isNewAccount: true,
        loginUrl: SAMPLE_LOGIN_URL,
        deliveryFeeEur: 4.99,
        deliveryCycleName: 'Юни 2026 кутия',
        personalizationLines: [
          'Спортове: Бягане, Йога',
          'Цветове: Синьо, Черно',
          'Вкусове: Шоколад',
          'Размер (горна): M',
        ],
        delivery: {
          deliveryMethod: 'speedy_automat',
          speedyOfficeName: 'Speedy автомат – Мол Люлин 2',
          speedyOfficeAddress: 'бул. Добринова скала 2, вход A, 1336 София',
          recipientName: 'Мария Иванова',
          recipientPhone: '+359 88 123 4567',
        },
      });
      break;

    // -----------------------------------------------------------------------
    // Subscription paused
    // -----------------------------------------------------------------------
    case 'sub-paused':
      html = generateSubscriptionPausedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        resumeUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Subscription resumed
    // -----------------------------------------------------------------------
    case 'sub-resumed':
      html = generateSubscriptionResumedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        nextDeliveryDate: '08.07.2026',
        manageUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Subscription cancelled
    // -----------------------------------------------------------------------
    case 'sub-cancelled':
      html = generateSubscriptionCancelledEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        resubscribeUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Delivery upcoming
    // -----------------------------------------------------------------------
    case 'delivery-upcoming':
      html = generateDeliveryUpcomingEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        orderNumber: SAMPLE_ORDER_NUMBER,
        deliveryDate: '08.06.2026',
        deliveryCycleName: 'Юни 2026 кутия',
        trackUrl: SAMPLE_TRACK_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Frequency changed
    // -----------------------------------------------------------------------
    case 'frequency-changed':
      html = generateFrequencyChangedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        oldFrequency: 'Месечна',
        newFrequency: 'Сезонна',
        manageUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Address changed
    // -----------------------------------------------------------------------
    case 'address-changed':
      html = generateAddressChangedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        oldAddress: 'ул. Витоша 42, 1000 София',
        newAddress: 'бул. Цар Освободител 8, 1000 София',
        manageUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Preferences updated
    // -----------------------------------------------------------------------
    case 'preferences-updated':
      html = generatePreferencesUpdatedEmail({
        subscriptionNumber: SAMPLE_SUB_NUMBER,
        boxTypeName: 'Sport кутия',
        summaryLines: [
          '🏋️ Спортове: Плуване, Колоездене',
          '🎨 Цветове: Зелено',
          '🍎 Вкусове: Ягода',
          '👕 Размер (горна): L',
        ],
        manageUrl: SAMPLE_MANAGE_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Delivery reminder
    // -----------------------------------------------------------------------
    case 'delivery-reminder':
      html = generateDeliveryReminderEmail({
        customerName: 'Мария Иванова',
        orderNumber: SAMPLE_ORDER_NUMBER,
        shippedAt: '2026-05-01T10:00:00Z',
        confirmUrl: SAMPLE_CONFIRM_URL,
        reminderNumber: 1,
        autoConfirmDate: '10.05.2026',
        reportProblemUrl: SAMPLE_REPORT_URL,
      });
      break;

    case 'delivery-reminder-2':
      html = generateDeliveryReminderEmail({
        customerName: 'Мария Иванова',
        orderNumber: SAMPLE_ORDER_NUMBER,
        shippedAt: '2026-05-01T10:00:00Z',
        confirmUrl: SAMPLE_CONFIRM_URL,
        reminderNumber: 2,
        autoConfirmDate: '10.05.2026',
        reportProblemUrl: SAMPLE_REPORT_URL,
      });
      break;

    case 'delivery-reminder-3':
      html = generateDeliveryReminderEmail({
        customerName: 'Мария Иванова',
        orderNumber: SAMPLE_ORDER_NUMBER,
        shippedAt: '2026-05-01T10:00:00Z',
        confirmUrl: SAMPLE_CONFIRM_URL,
        reminderNumber: 3,
        autoConfirmDate: '10.05.2026',
        reportProblemUrl: SAMPLE_REPORT_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Delivery auto-confirmed
    // -----------------------------------------------------------------------
    case 'delivery-auto-confirmed':
      html = generateDeliveryAutoConfirmedEmail({
        customerName: 'Мария Иванова',
        orderNumber: SAMPLE_ORDER_NUMBER,
        confirmedAt: '2026-05-10T09:00:00Z',
        reportProblemUrl: SAMPLE_REPORT_URL,
      });
      break;

    // -----------------------------------------------------------------------
    // Auth / account emails
    // -----------------------------------------------------------------------
    case 'customer-invite':
      html = generateCustomerInviteEmail('Мария Иванова', SAMPLE_SETUP_URL);
      break;

    case 'staff-invite':
      html = generateStaffInviteEmail('Иван Петров', 'Маркетинг', SAMPLE_SETUP_URL);
      break;

    case 'magic-registration':
      html = generateMagicRegistrationEmail('Мария Иванова', SAMPLE_SETUP_URL);
      break;

    case 'magic-login':
      html = generateMagicLinkLoginEmail(SAMPLE_LOGIN_URL);
      break;

    case 'email-confirmation':
      html = generateEmailConfirmationEmail('Мария Иванова', SAMPLE_CONFIRM_URL);
      break;

    case 'password-reset':
      html = generatePasswordResetEmail('Мария Иванова', SAMPLE_SETUP_URL);
      break;

    case 'otp-verification':
      html = generateOtpVerificationEmail('847291', 'Мария');
      break;

    // -----------------------------------------------------------------------
    // Profile / account
    // -----------------------------------------------------------------------
    case 'profile-updated':
      html = generateProfileUpdatedEmail({
        changes: [
          { label: 'Имейл', oldValue: 'old@example.com', newValue: 'maria@example.com' },
          { label: 'Телефон', oldValue: '+359 88 000 0000', newValue: '+359 88 123 4567' },
        ],
      });
      break;

    case 'account-deleted':
      html = generateAccountDeletedEmail();
      break;

    default:
      return NextResponse.json({ error: `Unknown template: "${template}"` }, { status: 400 });
  }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? '') : '';
    const errorHtml = `<!DOCTYPE html><html><body style="font-family:monospace;padding:24px;color:#c0392b">
<h2>Template render error</h2>
<p><strong>${template}</strong></p>
<pre style="background:#fdf2f2;padding:16px;border-radius:8px;overflow:auto">${message}\n\n${stack}</pre>
</body></html>`;
    return new NextResponse(errorHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
