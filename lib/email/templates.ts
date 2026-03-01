/**
 * Email templates for FitFlow transactional emails
 * These are inline HTML templates. For production, consider using Brevo's template editor.
 * 
 * NOTE: Labels must be fetched from the database via lib/data/catalog.ts
 * and passed to email generation functions. No hardcoded fallbacks.
 */

import type { ConfirmationEmailData } from './types';
import {
  formatPriceDual,
  formatPriceEur,
  formatSavings,
} from '@/lib/catalog';
import { escapeHtml } from '@/lib/utils/sanitize';
import { EMAIL } from './constants';
import { wrapInEmailLayout, emailCtaButton, emailContactLine } from './layout';

// ============================================================================
// Safe Price Formatting (email-specific)
// ============================================================================

/** Format dual price for emails; shows EUR-only when BGN is unavailable */
function safePriceDual(eur: number | null | undefined, bgn: number | null | undefined): string {
  if (eur == null) return '—';
  if (bgn != null && bgn > 0) return formatPriceDual(eur, bgn);
  return formatPriceEur(eur);
}

/** Format savings for emails; shows EUR-only when BGN is unavailable */
function safeSavings(eur: number | null | undefined, bgn: number | null | undefined): string {
  if (eur == null || eur <= 0) return '';
  if (bgn != null && bgn > 0) return formatSavings(eur, bgn);
  return `Спестяваш ${formatPriceEur(eur)}`;
}

// ============================================================================
// Label Map Type
// ============================================================================

/**
 * A map of IDs to display labels
 */
export type LabelMap = Record<string, string>;

/**
 * All label maps needed for email generation
 */
export interface EmailLabelMaps {
  boxTypes: LabelMap;
  sports: LabelMap;
  flavors: LabelMap;
  dietary: LabelMap;
  colors: LabelMap;
  contents: LabelMap;
}

// ============================================================================
// Utility: Format options with "other" value
// ============================================================================

/**
 * Format a list of options with "other" value appended if present
 * @param options - Array of option IDs
 * @param otherValue - The custom "other" value
 * @param labelMap - Map of option IDs to labels
 * @returns Formatted string with labels and optional "other" value
 */
export function formatOptionsWithOther(
  options: string[],
  otherValue: string | undefined,
  labelMap: LabelMap
): string {
  const labels = options.map(opt => labelMap[opt] ?? opt);
  const result = labels.join(', ');
  
  if (options.includes('other') && otherValue?.trim()) {
    return `${result} (${escapeHtml(otherValue)})`;
  }
  
  return result;
}

// ============================================================================
// Label Lookup Functions
// These require label maps to be passed in - no hardcoded fallbacks
// ============================================================================

/**
 * Get display name from a label map, returning the key if not found
 */
function getLabelOrKey(labelMap: LabelMap, key: string): string {
  return labelMap[key] ?? key;
}

/**
 * Map an array of IDs to display names using a label map
 */
function mapToDisplayNames(items: string[], labelMap: LabelMap): string[] {
  return items.map(item => getLabelOrKey(labelMap, item));
}

function printOtherOption(array: string[] | undefined, otherValue: string | undefined): string {
  if (array?.includes('other') && otherValue) {
    return ` (${escapeHtml(otherValue)})`;
  }

  return '';
}

/**
 * Generate color swatches HTML for email
 */
function generateColorSwatchesHtml(colors: string[], colorLabels: LabelMap): string {
  if (!colors || colors.length === 0) return '';
  
  const swatches = colors.map(color => {
    const colorName = getLabelOrKey(colorLabels, color);
    const borderStyle = color === '#FFFFFF' ? 'border: 1px solid #e0e0e0;' : '';
    return `<span title="${colorName}" style="display: inline-block; width: 24px; height: 24px; background-color: ${color}; border-radius: 4px; margin-right: 6px; ${borderStyle}"></span>`;
  }).join('');
  
  return `<p style="margin: 5px 0;"><strong>Любими цветове:</strong></p><p style="margin: 5px 0;">${swatches}</p>`;
}

/**
 * Generate delivery info section HTML for email
 */
function generateDeliverySection(data: ConfirmationEmailData): string {
  if (!data.deliveryMethod) return '';

  let addressHtml = '';

  if (data.deliveryMethod === 'speedy_office') {
    addressHtml = `
      <p style="margin: 5px 0;"><strong>Метод на доставка:</strong> До офис на Speedy</p>
      ${data.speedyOfficeName ? `<p style="margin: 5px 0;"><strong>Офис:</strong> ${escapeHtml(data.speedyOfficeName)}</p>` : ''}
      ${data.speedyOfficeAddress ? `<p style="margin: 5px 0; color: ${EMAIL.colors.textMutedAlt}; font-size: 14px;">${escapeHtml(data.speedyOfficeAddress)}</p>` : ''}
    `;
  } else {
    const addr = data.shippingAddress;
    if (addr) {
      const parts: string[] = [];
      if (addr.streetAddress) parts.push(escapeHtml(addr.streetAddress));
      if (addr.buildingEntrance) parts.push(`Вход ${escapeHtml(addr.buildingEntrance)}`);
      if (addr.floor) parts.push(`ет. ${escapeHtml(addr.floor)}`);
      if (addr.apartment) parts.push(`ап. ${escapeHtml(addr.apartment)}`);
      const line1 = parts.join(', ');
      const line2 = `${addr.postalCode ? escapeHtml(addr.postalCode) : ''} ${addr.city ? escapeHtml(addr.city) : ''}`.trim();

      addressHtml = `
        <p style="margin: 5px 0;"><strong>Метод на доставка:</strong> Доставка до адрес</p>
        ${line1 ? `<p style="margin: 5px 0;">${line1}</p>` : ''}
        ${line2 ? `<p style="margin: 5px 0;">${line2}</p>` : ''}
      `;
    }
  }

  const recipient = data.shippingAddress;
  const recipientHtml = recipient ? `
    ${recipient.fullName ? `<p style="margin: 5px 0;"><strong>Получател:</strong> ${escapeHtml(recipient.fullName)}</p>` : ''}
    ${recipient.phone ? `<p style="margin: 5px 0;"><strong>Телефон:</strong> ${escapeHtml(recipient.phone)}</p>` : ''}
  ` : '';

  const notesHtml = recipient?.deliveryNotes
    ? `<p style="margin: 5px 0; color: ${EMAIL.colors.textMutedAlt}; font-size: 14px;"><strong>Бележки:</strong> ${escapeHtml(recipient.deliveryNotes)}</p>`
    : '';

  return `
    <div style="background-color: ${EMAIL.sections.delivery}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: ${EMAIL.colors.textHeading}; margin-top: 0;">🚚 Данни за доставка</h3>
      ${recipientHtml}
      ${addressHtml}
      ${notesHtml}
    </div>
  `;
}

/**
 * Generate promo code section HTML for email
 */
function generatePromoCodeSection(data: ConfirmationEmailData): string {
  if (!data.hasPromoCode) return '';

  return `
    <div style="background-color: ${EMAIL.sections.promoBg}; border: 1px solid ${EMAIL.sections.promoBorder}; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0 0 10px 0; color: ${EMAIL.sections.promoText}; font-weight: bold;">
        ✅ Промо код ${data.promoCode} е приложен – ${data.discountPercent}% отстъпка
      </p>
      <p style="margin: 5px 0; color: ${EMAIL.sections.promoText};">
        <span style="text-decoration: line-through; color: ${EMAIL.colors.textMutedAlt};">${safePriceDual(data.originalPriceEur, data.originalPriceBgn)}</span>
        &nbsp;→&nbsp;
        <strong>${safePriceDual(data.finalPriceEur, data.finalPriceBgn)}</strong>
      </p>
      <p style="margin: 5px 0 0 0; color: ${EMAIL.sections.promoText}; font-size: 14px;">
        ${safeSavings(data.discountAmountEur, data.discountAmountBgn)}
      </p>
    </div>
  `;
}

/**
 * Generate confirmation email HTML
 * Unified template for both legacy conversion and standard order confirmation emails.
 * 
 * @param data - Confirmation email data
 * @param emailType - 'legacy' includes free delivery banner; 'order' is standard
 * @param labels - Label maps fetched from database (optional for backward compatibility)
 */
export function generateConfirmationEmail(
  data: ConfirmationEmailData,
  emailType: 'legacy' | 'order' = 'order',
  labels?: Partial<EmailLabelMaps>
): string {
  // Use provided labels or empty maps (will fall back to raw IDs)
  const sportLabels = labels?.sports ?? {};
  const flavorLabels = labels?.flavors ?? {};
  const dietaryLabels = labels?.dietary ?? {};
  const colorLabels = labels?.colors ?? {};

  // Convert raw values to display names
  const sportsDisplay = data.sports?.length ? mapToDisplayNames(data.sports, sportLabels) : [];
  const flavorsDisplay = data.flavors?.length ? mapToDisplayNames(data.flavors, flavorLabels) : [];
  const dietaryDisplay = data.dietary?.length ? mapToDisplayNames(data.dietary, dietaryLabels) : [];

  const personalizationSection = data.wantsPersonalization
    ? `
      <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: ${EMAIL.colors.textHeading}; margin-top: 0;">Твоите предпочитания</h3>
        ${sportsDisplay.length ? `<p><strong>Спортове:</strong> ${sportsDisplay.join(', ')}  ${printOtherOption(data.sports, data.sportOther)}</p>` : ''}
        ${data.colors?.length ? generateColorSwatchesHtml(data.colors, colorLabels) : ''}
        ${flavorsDisplay.length ? `<p><strong>Вкусове:</strong> ${flavorsDisplay.join(', ')}  ${printOtherOption(data.flavors, data.flavorOther)}</p>` : ''}
        ${data.sizeUpper ? `<p><strong>Размер (горна част):</strong> ${data.sizeUpper}</p>` : ''}
        ${data.sizeLower ? `<p><strong>Размер (долна част):</strong> ${data.sizeLower}</p>` : ''}
        ${dietaryDisplay.length ? `<p><strong>Диетични предпочитания:</strong> ${dietaryDisplay.join(', ')}  ${printOtherOption(data.dietary, data.dietaryOther)}</p>` : ''}
        ${data.additionalNotes ? `<p><strong>Допълнителни бележки:</strong> ${escapeHtml(data.additionalNotes)}</p>` : ''}
      </div>
    `
    : '';

  // Generate promo code section if applicable
  const promoCodeSection = generatePromoCodeSection(data);

  // Copy differences between legacy and order emails
  const confirmationText = 'Твоята поръчка беше успешно регистрирана! Благодарим ти, че избра FitFlow.';

  const freeDeliveryBanner = emailType === 'legacy'
    ? `
            <!-- Free Delivery Banner -->
            <div style="background-color: ${EMAIL.sections.freeDeliveryBg}; border: 2px solid ${EMAIL.sections.freeDeliveryBorder}; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: ${EMAIL.sections.freeDeliveryText}; font-size: 18px; font-weight: bold;">
                🚚 Безплатна доставка за твоята първа кутия!
              </p>
            </div>
    `
    : '';

  const bodyHtml = `
            <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
              Благодарим ти, ${escapeHtml(data.fullName)}!
            </h2>
            
            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              ${confirmationText}
            </p>
            
            ${freeDeliveryBanner}
            
            <!-- Order Details -->
            <div style="background-color: ${EMAIL.sections.personalization}; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: ${EMAIL.colors.textHeading}; margin-top: 0;">📦 Детайли на поръчката</h3>
              <p style="margin: 5px 0;"><strong>Номер на поръчка:</strong> ${data.orderId}</p>
              <p style="margin: 5px 0;"><strong>Избрана кутия:</strong> ${data.boxTypeDisplay}${!data.hasPromoCode ? ` (${safePriceDual(data.originalPriceEur, data.originalPriceBgn)})` : ''}</p>
              <p style="margin: 5px 0;"><strong>Персонализация:</strong> ${data.wantsPersonalization ? 'Да' : 'Не'}</p>
            </div>
            
            ${generateDeliverySection(data)}
            
            ${promoCodeSection}
            
            ${personalizationSection}
            
            <!-- What's Next -->
            <div style="border-left: 4px solid ${EMAIL.colors.ctaButton}; padding-left: 20px; margin: 30px 0;">
              <h3 style="color: ${EMAIL.colors.textHeading}; margin-top: 0;">Какво следва?</h3>
              <ol style="color: ${EMAIL.colors.textPrimary}; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Ще прегледаме твоята поръчка и предпочитания.</li>
                <li style="margin-bottom: 10px;">Ще се свържем с теб за потвърждение на детайлите в близко бъдеще.</li>
                <li style="margin-bottom: 10px;">Ще подготвим твоята персонализирана FitFlow кутия.</li>
                <li>Ще получиш известие, когато кутията е на път към теб!</li>
              </ol>
            </div>
            
            ${emailContactLine()}
  `;

  return wrapInEmailLayout(bodyHtml);
}

/**
 * @deprecated Use `generateConfirmationEmail(data, 'order', labels)` instead
 */
export function generateOrderConfirmationEmail(
  data: ConfirmationEmailData,
  labels?: Partial<EmailLabelMaps>
): string {
  return generateConfirmationEmail(data, 'order', labels);
}

// ============================================================================
// Invite Email Templates
// ============================================================================

/**
 * Generate a customer invite email HTML.
 * Sent when an admin creates a customer account on their behalf.
 *
 * @param name - Customer's display name
 * @param setupUrl - URL to set up their password
 * @returns HTML string for the email
 */
export function generateCustomerInviteEmail(name: string, setupUrl: string): string {
  const bodyHtml = `
            <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
              Здравейте, ${escapeHtml(name)}!
            </h2>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Създадохме акаунт за вас във FitFlow, за да можете да управлявате поръчките и абонамента си.
            </p>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Кликнете бутона по-долу, за да активирате акаунта си. След това можете по желание да зададете парола или да продължите да влизате с магически линк.
            </p>

            ${emailCtaButton(setupUrl, 'Активирайте акаунта си')}

            <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
              Можете да зададете парола по всяко време от настройките на акаунта си.
            </p>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Ако не сте поискали създаване на акаунт, моля игнорирайте този имейл.
            </p>

            ${emailContactLine()}
  `;

  return wrapInEmailLayout(bodyHtml);
}

/**
 * Generate a staff invite email HTML.
 * Sent when a staff member is invited to the admin panel.
 *
 * @param name - Staff member's display name
 * @param role - The role they are being invited as (e.g. "Администратор")
 * @param setupUrl - URL to set up their password
 * @returns HTML string for the email
 */
export function generateStaffInviteEmail(name: string, role: string, setupUrl: string): string {
  const bodyHtml = `
            <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
              Добре дошли в екипа на FitFlow, ${escapeHtml(name)}!
            </h2>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Поканени сте като <strong>${escapeHtml(role)}</strong> в административния панел на FitFlow.
            </p>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Моля, задайте парола за вашия акаунт, като кликнете на бутона по-долу.
            </p>

            ${emailCtaButton(setupUrl, 'Задайте парола')}

            <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
              След задаване на парола ще бъдете пренасочени към админ панела.
            </p>

            ${emailContactLine()}
  `;

  return wrapInEmailLayout(bodyHtml);
}

// ============================================================================
// Magic Link Email Templates
// ============================================================================

/**
 * Generate a magic-link registration email HTML.
 * Sent to new users who register via magic-link mode.
 * The link activates their account and takes them to /setup-password
 * where they can optionally set a password.
 *
 * @param name - The new user's display name
 * @param setupUrl - URL to activate account and optionally set a password
 * @returns HTML string for the email
 */
export function generateMagicRegistrationEmail(name: string, setupUrl: string): string {
  const bodyHtml = `
            <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
              Здравейте, ${escapeHtml(name)}!
            </h2>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Благодарим ви за регистрацията във FitFlow!
            </p>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Кликнете бутона по-долу, за да активирате акаунта си. След това можете по желание да зададете парола или да продължите да влизате с магически линк.
            </p>

            ${emailCtaButton(setupUrl, 'Активирайте акаунта си')}

            <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
              Ако не сте заявили тази регистрация, моля игнорирайте този имейл.
            </p>

            ${emailContactLine()}
  `;

  return wrapInEmailLayout(bodyHtml);
}

/**
 * Generate a magic-link login email HTML.
 * Sent to existing users who request a magic-link login.
 * The link logs them directly into their account.
 *
 * @param loginUrl - URL that logs the user into their account
 * @returns HTML string for the email
 */
export function generateMagicLinkLoginEmail(loginUrl: string): string {
  const bodyHtml = `
            <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
              Здравейте,
            </h2>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Получихме заявка за вход във вашия FitFlow акаунт.
            </p>

            <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
              Кликнете бутона по-долу, за да влезете.
            </p>

            ${emailCtaButton(loginUrl, 'Влезте в акаунта')}

            <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
              Линкът е валиден за ограничено време. Ако не сте заявили този линк, можете спокойно да игнорирате този имейл.
            </p>

            ${emailContactLine()}
  `;

  return wrapInEmailLayout(bodyHtml);
}

// ============================================================================
// Auth Email Templates
// ============================================================================

/**
 * Generate a branded email-confirmation email HTML.
 * Sent to new users to verify their email address.
 *
 * @param name - User's display name
 * @param confirmUrl - URL that confirms the user's email
 * @returns HTML string for the email
 */
export function generateEmailConfirmationEmail(name: string, confirmUrl: string): string {
  const bodyHtml = `
  <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
    Потвърдете имейла си, ${escapeHtml(name)}!
  </h2>
  <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
    Благодарим ви за регистрацията във FitFlow! Кликнете бутона по-долу, за да потвърдите имейл адреса си.
  </p>
  ${emailCtaButton(confirmUrl, 'Потвърдете имейла')}
  <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
    Линкът е валиден за ограничено време. Ако не сте заявили тази регистрация, моля игнорирайте този имейл.
  </p>
  ${emailContactLine()}
`;
  return wrapInEmailLayout(bodyHtml);
}

/**
 * Generate a branded password-reset email HTML.
 * Sent to users who request a password reset.
 *
 * @param name - User's display name
 * @param resetUrl - URL that takes the user to set a new password
 * @returns HTML string for the email
 */
export function generatePasswordResetEmail(name: string, resetUrl: string): string {
  const bodyHtml = `
  <h2 style="color: ${EMAIL.colors.textHeading}; margin-top: 0; font-size: 24px;">
    Нулиране на парола
  </h2>
  <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
    Здравейте, ${escapeHtml(name)}! Получихме заявка за нулиране на паролата на вашия FitFlow акаунт.
  </p>
  <p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
    Кликнете бутона по-долу, за да зададете нова парола.
  </p>
  ${emailCtaButton(resetUrl, 'Задайте нова парола')}
  <p style="color: ${EMAIL.colors.textMuted}; font-size: 14px; line-height: 1.6;">
    Линкът е валиден за ограничено време. Ако не сте заявили тази промяна, можете спокойно да игнорирате този имейл.
  </p>
  ${emailContactLine()}
`;
  return wrapInEmailLayout(bodyHtml);
}
