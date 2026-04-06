/**
 * Subscription Conversion Email Template
 *
 * Combined email confirming subscription activation + optional account setup
 * when a guest converts a one-time order to a subscription.
 */

import { escapeHtml } from '@/lib/utils/sanitize';
import { formatPriceDual } from '@/lib/catalog/format';
import { EMAIL } from './constants';
import { wrapInEmailLayout, emailCtaButton, emailContactLine } from './layout';

// ============================================================================
// Parameter Interface
// ============================================================================

export interface SubscriptionConversionEmailData {
  fullName: string;
  email: string;
  boxType: string;
  boxName: string;
  frequency: string;
  frequencyLabel: string;
  basePriceEur: number;
  currentPriceEur: number;
  basePriceBgn: number;
  currentPriceBgn: number;
  promoCode: string | null;
  discountPercent: number | null;
  nextDeliveryDate: string | null;
  orderNumber: string;
  subscriptionNumber: string;
  isNewAccount: boolean;
  loginUrl: string | null;
}

// ============================================================================
// Subject
// ============================================================================

export const SUBSCRIPTION_CONVERSION_SUBJECT = 'FitFlow - Абонаментът ти е активен!';

// ============================================================================
// Template
// ============================================================================

export function generateSubscriptionConversionEmail(
  data: SubscriptionConversionEmailData,
): string {
  const firstName = escapeHtml(data.fullName.split(' ')[0]);
  const boxName = escapeHtml(data.boxName);
  const frequencyLabel = escapeHtml(data.frequencyLabel);
  const orderNumber = escapeHtml(data.orderNumber);

  const hasDiscount =
    data.promoCode !== null &&
    data.discountPercent !== null &&
    data.discountPercent > 0;

  // -- Price display --------------------------------------------------------
  const priceLines: string[] = [];

  if (hasDiscount) {
    priceLines.push(
      `💰 Редовна цена: <span style="text-decoration: line-through;">${formatPriceDual(data.basePriceEur, data.basePriceBgn)}</span>`,
    );
    priceLines.push(
      `🏷️ Цена с отстъпка: <strong>${formatPriceDual(data.currentPriceEur, data.currentPriceBgn)}</strong>`,
    );
    priceLines.push(
      `✅ Приложен код: <strong>${escapeHtml(data.promoCode!)}</strong> (-${data.discountPercent}%)`,
    );
  } else {
    priceLines.push(
      `💰 Цена: <strong>${formatPriceDual(data.currentPriceEur, data.currentPriceBgn)}</strong>`,
    );
  }

  // -- Info box lines -------------------------------------------------------
  const infoLines = [
    `� Абонамент: ${escapeHtml(data.subscriptionNumber)}`,
    `�📦 Кутия: ${boxName}`,
    `🔄 Честота: ${frequencyLabel}`,
    ...priceLines,
  ];

  if (data.nextDeliveryDate) {
    infoLines.push(`📅 Следваща доставка: ${escapeHtml(data.nextDeliveryDate)}`);
  }

  // -- Account login block (conditional - new guests) -----------------------
  const accountLoginHtml =
    data.isNewAccount && data.loginUrl
      ? `
    <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 12px 0;">🔑 Твоят акаунт</h3>
      <p style="color: ${EMAIL.colors.textPrimary}; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
        Създадохме акаунт за теб с имейл <strong>${escapeHtml(data.email)}</strong>.
      </p>
      <p style="color: ${EMAIL.colors.textPrimary}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        От акаунта си можеш да управляваш абонамента, да сменяш предпочитанията си и да следиш доставките.
      </p>
      ${emailCtaButton(data.loginUrl, 'Виж абонамента си')}
      <p style="color: ${EMAIL.colors.textMuted}; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
        В бъдеще можеш да влезеш с магически линк от <a href="https://fitflow.bg/login" style="color: ${EMAIL.colors.linkColor};">страницата за вход</a>.
      </p>
    </div>`
      : '';

  // -- Build body -----------------------------------------------------------
  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ти е активен! 🎉</h2>

    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Здравей, ${firstName}!
    </p>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Успешно конвертира поръчката си в абонамент. Вече си част от FitFlow семейството!
    </p>

    <div style="background-color: ${EMAIL.sections.delivery}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      ${infoLines.map((l) => `<p style="margin: 5px 0; color: ${EMAIL.colors.textHeading};"><strong>${l}</strong></p>`).join('\n      ')}
    </div>

    <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.5;">
      Конвертирано от поръчка <strong>#${orderNumber}</strong>
    </p>

    ${accountLoginHtml}

    <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 12px 0;">📋 Какво следва?</h3>
      <ul style="color: ${EMAIL.colors.textPrimary}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Ще получиш имейл преди всяка доставка</li>
        <li>Можеш да управляваш абонамента си от <a href="https://fitflow.bg/account/subscriptions" style="color: ${EMAIL.colors.linkColor}; font-weight: 600;">профила си</a></li>
        <li>Можеш да поставиш на пауза или да откажеш по всяко време</li>
      </ul>
    </div>

    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}
