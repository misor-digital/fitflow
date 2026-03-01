/**
 * Subscription Lifecycle Email Templates
 *
 * Local, code-controlled templates for all subscription lifecycle events.
 * Uses the shared FitFlow email layout, design tokens, and utilities.
 */

import { escapeHtml } from '@/lib/utils/sanitize';
import { EMAIL } from './constants';
import { wrapInEmailLayout, emailCtaButton, emailContactLine } from './layout';

// ============================================================================
// Parameter Interfaces
// ============================================================================

export interface SubscriptionCreatedParams {
  boxTypeName: string;
  frequency: string;
  nextDeliveryDate: string;
  manageUrl: string;
}

export interface SubscriptionPausedParams {
  boxTypeName: string;
  resumeUrl: string;
}

export interface SubscriptionResumedParams {
  boxTypeName: string;
  nextDeliveryDate: string;
  manageUrl: string;
}

export interface SubscriptionCancelledParams {
  boxTypeName: string;
  resubscribeUrl: string;
}

export interface DeliveryUpcomingParams {
  boxTypeName: string;
  deliveryDate: string;
  trackUrl: string;
}

// ============================================================================
// Shared Helpers
// ============================================================================

function infoBox(lines: string[]): string {
  return `<div style="background-color: ${EMAIL.sections.delivery}; padding: 20px; border-radius: 8px; margin: 20px 0;">
  ${lines.map((l) => `<p style="margin: 5px 0; color: ${EMAIL.colors.textHeading};"><strong>${l}</strong></p>`).join('\n  ')}
</div>`;
}

// ============================================================================
// Template Functions
// ============================================================================

export function generateSubscriptionCreatedEmail(params: SubscriptionCreatedParams): string {
  const boxTypeName = escapeHtml(params.boxTypeName);
  const frequency = escapeHtml(params.frequency);
  const nextDeliveryDate = escapeHtml(params.nextDeliveryDate);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ви е активиран! 🎉</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Благодарим ви, че се абонирахте за <strong>${boxTypeName}</strong> кутия с <strong>${frequency}</strong> доставка.
    </p>
    ${infoBox([
      `📦 Кутия: ${boxTypeName}`,
      `🔄 Честота: ${frequency}`,
      `📅 Следваща доставка: ${nextDeliveryDate}`,
    ])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionPausedEmail(params: SubscriptionPausedParams): string {
  const boxTypeName = escapeHtml(params.boxTypeName);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ви е на пауза ⏸️</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Вашият абонамент за <strong>${boxTypeName}</strong> кутия е временно спрян. Можете да го възобновите по всяко време.
    </p>
    ${emailCtaButton(params.resumeUrl, 'Възобновете абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionResumedEmail(params: SubscriptionResumedParams): string {
  const boxTypeName = escapeHtml(params.boxTypeName);
  const nextDeliveryDate = escapeHtml(params.nextDeliveryDate);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ви е възобновен! ▶️</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Вашият абонамент за <strong>${boxTypeName}</strong> кутия отново е активен.
    </p>
    ${infoBox([`📅 Следваща доставка: ${nextDeliveryDate}`])}
    ${emailCtaButton(params.manageUrl, 'Управление на абонамента')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateSubscriptionCancelledEmail(params: SubscriptionCancelledParams): string {
  const boxTypeName = escapeHtml(params.boxTypeName);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Абонаментът ви е отменен</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Вашият абонамент за <strong>${boxTypeName}</strong> кутия е отменен. Ще ни липсвате! 💔
    </p>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Можете да се абонирате отново по всяко време.
    </p>
    ${emailCtaButton(params.resubscribeUrl, 'Абонирайте се отново')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}

export function generateDeliveryUpcomingEmail(params: DeliveryUpcomingParams): string {
  const boxTypeName = escapeHtml(params.boxTypeName);
  const deliveryDate = escapeHtml(params.deliveryDate);

  const body = `
    <h2 style="color: ${EMAIL.colors.textHeading}; margin: 0 0 20px 0;">Доставката ви наближава! 🚚</h2>
    <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
      Вашата <strong>${boxTypeName}</strong> кутия е на път!
    </p>
    ${infoBox([`📅 Очаквана доставка: ${deliveryDate}`])}
    ${emailCtaButton(params.trackUrl, 'Проследете доставката')}
    ${emailContactLine()}`;

  return wrapInEmailLayout(body);
}
