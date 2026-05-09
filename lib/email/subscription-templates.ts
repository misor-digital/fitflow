/**
 * Subscription Lifecycle Email Templates
 *
 * Local, code-controlled templates for all subscription lifecycle events.
 * Uses the shared FitFlow email layout, design tokens, and utilities.
 */

import { escapeHtml } from '@/lib/utils/sanitize';
import { EMAIL } from './constants';
import { wrapInEmailLayout, emailCtaButton, emailContactLine, emailDeliverySection, type EmailDeliveryInfo } from './layout';

// ============================================================================
// Parameter Interfaces
// ============================================================================

export interface SubscriptionCreatedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  frequency: string;
  nextDeliveryDate: string;
  deliveryCycleName?: string | null;
  personalizationLines?: string[];
  delivery?: EmailDeliveryInfo;
  manageUrl: string;
}

export interface SubscriptionPausedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  resumeUrl: string;
}

export interface SubscriptionResumedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  nextDeliveryDate: string;
  manageUrl: string;
}

export interface SubscriptionCancelledParams {
  subscriptionNumber: string;
  boxTypeName: string;
  resubscribeUrl: string;
}

export interface DeliveryUpcomingParams {
  subscriptionNumber: string;
  boxTypeName: string;
  orderNumber: string;
  deliveryDate: string;
  deliveryCycleName?: string | null;
  trackUrl: string;
}

export interface FrequencyChangedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  oldFrequency: string;
  newFrequency: string;
  manageUrl: string;
}

export interface AddressChangedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  oldAddress: string;
  newAddress: string;
  manageUrl: string;
}

export interface PreferencesUpdatedParams {
  subscriptionNumber: string;
  boxTypeName: string;
  summaryLines: string[];
  manageUrl: string;
}

// ============================================================================
// Shared Helpers
// ============================================================================

function infoBox(title: string, lines: string[]): string {
  return `<div style="background-color: ${EMAIL.sections.delivery}; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 12px 0;">${title}</h3>
  ${lines.map((l) => `<p style="margin: 5px 0; color: ${EMAIL.colors.textHeading};"><strong>${l}</strong></p>`).join('\n  ')}
</div>`;
}

// ============================================================================
// Template Functions
// ============================================================================

export function generateSubscriptionCreatedEmail(params: SubscriptionCreatedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);
  const frequency = escapeHtml(params.frequency);
  const cycleName = params.deliveryCycleName ? escapeHtml(params.deliveryCycleName) : 'следващия цикъл на доставка';

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ти е активиран! 🎉</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Благодарим ти, че се абонира за <strong>${boxTypeName}</strong> кутия с <strong>${frequency}</strong> доставка.
    </p>
    ${infoBox('📦 Детайли', [
      `Абонамент: ${subscriptionNumber}`,
      `Кутия: ${boxTypeName}`,
      `Честота: ${frequency}`,
      `Цикъл: ${cycleName}`,
    ])}
    ${params.personalizationLines?.length ? `
    <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 12px 0;">🎯 Твоите предпочитания</h3>
      ${params.personalizationLines.map((l) => `<p style="margin: 5px 0; color: ${EMAIL.colors.textPrimary};">${escapeHtml(l)}</p>`).join('\n      ')}
    </div>
    ` : ''}
    ${params.delivery ? emailDeliverySection(params.delivery) : ''}

    <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 12px 0;">📋 Какво следва?</h3>
      <ul style="color: ${EMAIL.colors.textPrimary}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Ще получиш имейл преди всяка доставка</li>
        <li>Можеш да управляваш абонамента си от <a href="https://fitflow.bg/account/subscriptions" style="color: ${EMAIL.colors.linkColor}; font-weight: 600;">профила си</a></li>
        <li>Можеш да поставиш на пауза или да откажеш по всяко време</li>
      </ul>
    </div>

    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionPausedEmail(params: SubscriptionPausedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ти е на пауза ⏸️</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Твоят абонамент <strong>${subscriptionNumber}</strong> за <strong>${boxTypeName}</strong> кутия е временно спрян. Можеш да го възобновиш по всяко време.
    </p>
    ${emailCtaButton(params.resumeUrl, 'Възобнови абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionResumedEmail(params: SubscriptionResumedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);
  const nextDeliveryDate = escapeHtml(params.nextDeliveryDate);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ти е възобновен! ▶️</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Твоят абонамент <strong>${subscriptionNumber}</strong> за <strong>${boxTypeName}</strong> кутия отново е активен.
    </p>
    ${infoBox('📅 Детайли', [`Следваща доставка: ${nextDeliveryDate}`])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionCancelledEmail(params: SubscriptionCancelledParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ти е отменен</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Твоят абонамент <strong>${subscriptionNumber}</strong> за <strong>${boxTypeName}</strong> кутия е отменен. Ще ни липсваш! 💔
    </p>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Можеш да се абонираш отново по всяко време.
    </p>
    ${emailCtaButton(params.resubscribeUrl, 'Абонирай се отново')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateDeliveryUpcomingEmail(params: DeliveryUpcomingParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);
  const orderNumber = escapeHtml(params.orderNumber);
  const deliveryDate = escapeHtml(params.deliveryDate);
  const upcomingCycleName = params.deliveryCycleName ? escapeHtml(params.deliveryCycleName) : 'следващия цикъл на доставка';

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Доставката ти наближава! 🚚</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Твоята <strong>${boxTypeName}</strong> кутия е на път!
    </p>
    ${infoBox('📦 Детайли', [
      `📋 Абонамент: ${subscriptionNumber}`,
      `📦 Кутия: ${boxTypeName}`,
      `🧾 Поръчка: #${orderNumber}`,
      `📅 Очаквана доставка: ${deliveryDate}`,
      `🚚 Цикъл: ${upcomingCycleName}`,
    ])}
    ${emailCtaButton(params.trackUrl, 'Проследи доставката')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateFrequencyChangedEmail(params: FrequencyChangedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);
  const oldFrequency = escapeHtml(params.oldFrequency);
  const newFrequency = escapeHtml(params.newFrequency);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Честотата на абонамента ти е променена 🔄</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Честотата на абонамент <strong>${subscriptionNumber}</strong> е успешно променена.
    </p>
    ${infoBox('🔄 Промяна', [
      `📋 Абонамент: ${subscriptionNumber}`,
      `📦 Кутия: ${boxTypeName}`,
      `❌ Предишна честота: ${oldFrequency}`,
      `✅ Нова честота: ${newFrequency}`,
    ])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateAddressChangedEmail(params: AddressChangedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);
  const oldAddress = escapeHtml(params.oldAddress);
  const newAddress = escapeHtml(params.newAddress);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Адресът на абонамента ти е променен 📍</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Адресът за доставка на абонамент <strong>${subscriptionNumber}</strong> е успешно променен.
    </p>
    ${infoBox('📍 Промяна', [
      `📋 Абонамент: ${subscriptionNumber}`,
      `📦 Кутия: ${boxTypeName}`,
      `❌ Предишен адрес: ${oldAddress}`,
      `✅ Нов адрес: ${newAddress}`,
    ])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generatePreferencesUpdatedEmail(params: PreferencesUpdatedParams): string {
  const subscriptionNumber = escapeHtml(params.subscriptionNumber);
  const boxTypeName = escapeHtml(params.boxTypeName);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Предпочитанията на абонамента ти са обновени ✏️</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Персонализацията на абонамент <strong>${subscriptionNumber}</strong> е успешно обновена.
    </p>
    ${infoBox('🎯 Предпочитания', [
      `📋 Абонамент: ${subscriptionNumber}`,
      `📦 Кутия: ${boxTypeName}`,
      ...params.summaryLines.map((l) => escapeHtml(l)),
    ])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}
