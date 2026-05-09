import { EMAIL } from './constants';

/**
 * Wraps inner body HTML in a complete HTML email document with
 * the standard FitFlow header, footer, and outer table skeleton.
 *
 * @param bodyHtml - The inner HTML to place between the header and footer.
 * @returns A complete, trimmed HTML email string.
 */
export function wrapInEmailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-family: ${EMAIL.typography.fontFamily}; background-color: ${EMAIL.colors.background};">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: ${EMAIL.layout.maxWidth}; max-width: 100%; border-collapse: collapse; background-color: ${EMAIL.colors.containerBg}; border-radius: ${EMAIL.layout.borderRadius}; box-shadow: ${EMAIL.layout.containerShadow};">
          <!-- Header -->
          <tr>
            <td style="background: ${EMAIL.colors.headerGradient}; padding: 40px 30px; text-align: center; border-radius: ${EMAIL.layout.borderRadius} ${EMAIL.layout.borderRadius} 0px 0px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">${EMAIL.brand.name}</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${EMAIL.brand.tagline}</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${EMAIL.colors.footerBg}; padding: 30px; text-align: center; border-radius: 0 0 ${EMAIL.layout.borderRadius} ${EMAIL.layout.borderRadius};">
              <p style="color: ${EMAIL.colors.textFooter}; font-size: 14px; margin: 0 0 10px 0;">
                ${EMAIL.brand.footerSignOff}<br><strong>${EMAIL.brand.footerTeam}</strong> 💪
              </p>
              <p style="color: ${EMAIL.colors.textFooterSecondary}; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${EMAIL.brand.name}. Всички права запазени.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Returns the standard FitFlow CTA button HTML block.
 *
 * @param href  - The URL the button links to.
 * @param label - The visible button text.
 * @returns An HTML string containing a centered call-to-action button.
 */
export function emailCtaButton(href: string, label: string): string {
  return `<div style="text-align: center; margin: 30px 0;">
  <a href="${href}" style="display: inline-block; background-color: ${EMAIL.colors.ctaButton}; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; text-decoration: none;">
    ${label}
  </a>
</div>`;
}

/**
 * Returns the standard "Ако имаш въпроси" contact paragraph
 * used across all email templates.
 *
 * @returns An HTML string with a mailto link to the brand contact email.
 */
export function emailContactLine(): string {
  return `<p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
  Ако имаш въпроси, свържи се с нас на
  <a href="mailto:${EMAIL.brand.contactEmail}" style="color: ${EMAIL.colors.linkColor}; font-weight: 600;">
    ${EMAIL.brand.contactEmail}
  </a>
</p>`;
}

// ============================================================================
// Shared Delivery Section
// ============================================================================

export interface EmailDeliveryInfo {
  deliveryMethod?: 'address' | 'speedy_office' | 'speedy_automat' | null;
  speedyOfficeName?: string | null;
  speedyOfficeAddress?: string | null;
  deliveryDate?: string | null;
  deliveryFeeLabel?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    city?: string | null;
    postalCode?: string | null;
    streetAddress?: string | null;
    buildingEntrance?: string | null;
    floor?: string | null;
    apartment?: string | null;
    deliveryNotes?: string | null;
  } | null;
}

/** Renders a "🚚 Данни за доставка" section. Returns empty string when no delivery method is provided. */
export function emailDeliverySection(info: EmailDeliveryInfo): string {
  if (!info.deliveryMethod) return '';

  const esc = (v: string | null | undefined) =>
    v ? v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  let addressHtml = '';
  if (info.deliveryMethod === 'speedy_office' || info.deliveryMethod === 'speedy_automat') {
    const label = info.deliveryMethod === 'speedy_automat' ? 'До автомат на Speedy' : 'До офис на Speedy';
    addressHtml = `
      <p style="margin: 5px 0;"><strong>Метод на доставка:</strong> ${label}</p>
      ${info.speedyOfficeName ? `<p style="margin: 5px 0;"><strong>Локация:</strong> ${esc(info.speedyOfficeName)}</p>` : ''}
      ${info.speedyOfficeAddress ? `<p style="margin: 5px 0; color: ${EMAIL.colors.textMuted}; font-size: 14px;">${esc(info.speedyOfficeAddress)}</p>` : ''}
    `;
  } else {
    const addr = info.shippingAddress;
    if (addr) {
      const parts: string[] = [];
      if (addr.streetAddress) parts.push(esc(addr.streetAddress));
      if (addr.buildingEntrance) parts.push(`Вход ${esc(addr.buildingEntrance)}`);
      if (addr.floor) parts.push(`ет. ${esc(addr.floor)}`);
      if (addr.apartment) parts.push(`ап. ${esc(addr.apartment)}`);
      const line1 = parts.join(', ');
      const line2 = [addr.postalCode, addr.city].filter(Boolean).map(esc).join(' ');
      addressHtml = `
        <p style="margin: 5px 0;"><strong>Метод на доставка:</strong> Доставка до адрес</p>
        ${line1 ? `<p style="margin: 5px 0;">${line1}</p>` : ''}
        ${line2 ? `<p style="margin: 5px 0;">${line2}</p>` : ''}
      `;
    }
  }

  const addr = info.shippingAddress;
  const resolvedName = addr?.firstName
    ? `${esc(addr.firstName)} ${esc(addr.lastName ?? '')}`.trim()
    : esc(info.recipientName);
  const resolvedPhone = addr?.phone ?? info.recipientPhone;
  const recipientHtml = resolvedName ? `
    <p style="margin: 5px 0;"><strong>Получател:</strong> ${resolvedName}</p>
    ${resolvedPhone ? `<p style="margin: 5px 0;"><strong>Телефон:</strong> ${esc(resolvedPhone)}</p>` : ''}
  ` : '';

  const notesHtml = addr?.deliveryNotes
    ? `<p style="margin: 5px 0; color: ${EMAIL.colors.textMuted}; font-size: 14px;"><strong>Бележки:</strong> ${esc(addr.deliveryNotes)}</p>`
    : '';

  return `
  <div style="background-color: ${EMAIL.sections.delivery}; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: ${EMAIL.colors.textHeading}; margin-top: 0;">🚚 Данни за доставка</h3>
    ${recipientHtml}
    ${info.deliveryDate ? `<p style="margin: 5px 0;"><strong>Дата на доставка:</strong> ${esc(info.deliveryDate)}</p>` : ''}
    ${info.deliveryFeeLabel != null ? `<p style="margin: 5px 0;"><strong>Цена:</strong> ${esc(info.deliveryFeeLabel)}</p>` : ''}
    ${addressHtml}
    ${notesHtml}
  </div>`;
}
