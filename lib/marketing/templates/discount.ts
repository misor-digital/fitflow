/**
 * Discount Campaign Email Template
 * 
 * A promotional email template with:
 * - FitFlow branded heading with discount percentage
 * - Main content section (rich text)
 * - Free delivery banner (optional)
 * - Steps section (rich text)
 * - CTA button with click token for attribution
 */

import type { TemplateDefinition, DiscountCampaignVariables, VariableDefinition } from './types';
import { wrapEmailContent, escapeHtml, htmlToText } from './base';

// ============================================================================
// Template Variables Definition
// ============================================================================

export const discountTemplateVariables: VariableDefinition[] = [
  {
    key: 'discountPercent',
    label: 'Discount Percentage',
    type: 'number',
    placeholder: '10',
    defaultValue: 10,
    required: true,
    helpText: 'Used in heading and auto-generates promo code (e.g., 10 → FITFLOW10)',
  },
  {
    key: 'main',
    label: 'Main Content',
    type: 'richtext',
    placeholder: 'Възползвай се от нашата специална оферта...',
    helpText: 'Main content section. Supports rich text formatting.',
  },
  {
    key: 'steps',
    label: 'Steps Section',
    type: 'richtext',
    placeholder: '1. Кликни на бутона\n2. Избери продукти\n3. Завърши поръчката',
    helpText: 'Instructions for the recipient. Supports rich text formatting.',
  },
  {
    key: 'buttonLabel',
    label: 'CTA Button Text',
    type: 'text',
    placeholder: 'Вземи отстъпката',
    defaultValue: 'Вземи отстъпката',
    maxLength: 30,
    helpText: 'Text displayed on the call-to-action button',
  },
  {
    key: 'showFreeDelivery',
    label: 'Show Free Delivery Banner',
    type: 'checkbox',
    defaultValue: true,
    helpText: 'Display the free delivery promotional banner',
  },
];

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generate CTA URL with click token for attribution tracking
 * 
 * Note: Click token generation is done lazily at send time via generateClickToken
 * from clickToken.ts. For preview mode, we return a simple URL without attribution.
 * 
 * @param discountPercent - Discount percentage for promo code
 * @param campaignId - Campaign UUID (optional, for attribution)
 * @param recipientId - Recipient UUID (optional, for attribution)
 * @param campaignName - Campaign name for UTM (optional)
 * @param isPreview - Whether this is a preview (no real token)
 */
function generateCtaUrl(
  discountPercent: number,
  campaignId?: string,
  recipientId?: string,
  campaignName?: string,
  isPreview: boolean = false
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg';
  const promoCode = `FITFLOW${discountPercent}`;
  
  // For preview mode or no campaign, return simple URL without attribution
  if (isPreview || !campaignId) {
    return `${baseUrl}/?promocode=${promoCode}`;
  }
  
  // Generate UTM campaign identifier from campaign name
  const utmCampaign = campaignName 
    ? campaignName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
    : `campaign_${campaignId.substring(0, 8)}`;
  
  // For server-side generation, we need to dynamically import clickToken
  // This is handled by the caller (generateEmail in index.ts) which passes the token
  // For now, build URL with placeholder that will be replaced at send time
  const params = new URLSearchParams();
  params.set('utm_source', 'email');
  params.set('utm_medium', 'campaign');
  params.set('utm_campaign', utmCampaign);
  params.set('promocode', promoCode);
  
  // The mc (click token) parameter is added at send time by the campaign runner
  // when it has access to the server-side generateClickToken function
  if (campaignId && recipientId) {
    params.set('cid', campaignId);
    params.set('rid', recipientId);
  }
  
  return `${baseUrl}/?${params.toString()}`;
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate the email body content (without wrapper)
 */
function generateDiscountContent(
  variables: DiscountCampaignVariables,
  isPreview: boolean = false,
  campaignId?: string,
  recipientId?: string
): string {
  const {
    discountPercent = 10,
    main,
    steps,
    buttonLabel = 'Вземи отстъпката',
    showFreeDelivery = true,
    name,
    campaignName,
  } = variables;

  // Greeting with name fallback
  const greeting = name ? `Здравей, ${escapeHtml(name)}!` : '';

  // Generate CTA URL with attribution
  const ctaUrl = generateCtaUrl(
    discountPercent,
    campaignId,
    recipientId,
    campaignName,
    isPreview
  );

  // Section 1: Greeting
  const greetingHtml = greeting ? `
    <h2 style="text-align: center; color: #363636; margin: 0 0 20px 0; font-size: 24px;">${greeting}</h2>
  ` : '';

  // Section 2: Discount Heading (FitFlow in italics with orange shade)
  const discountHeadingHtml = discountPercent === 0 ? '' : `
    <div style="text-align: center; margin-bottom: 25px;">
      <p style="margin: 0; color: #363636; font-size: 28px; font-weight: bold;">
        ${discountPercent}% отстъпка <br/>
        за твоята първа <em style="font-style: italic; color: #e65c00;">FitFlow</em> кутия!
      </p>
    </div>
  `;

  // Section 3: Main Content (styled like Order Details from preorder template)
  const mainContentHtml = main && htmlToText(main) !== '' ? `
    <div style="background-color: #fff4ec; padding: 5px 20px; border-radius: 8px; margin: 20px 0;">
      <div style="color: #4a5568; font-size: 16px; line-height: 1.6;">
        ${main}
      </div>
    </div>
  ` : '';

  // Section 4: Free Delivery Banner
  const freeDeliveryHtml = showFreeDelivery ? `
    <div style="background-color: #e8f5e9; border: 2px solid #4caf50; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #2e7d32; font-size: 16px; font-weight: bold;">
        🚚 Получаваш и <br/>
        безплатна доставка за твоята първа кутия!
      </p>
    </div>
  ` : '';

  // Section 5: Steps Section (orange left border style)
  const stepsHtml = steps && htmlToText(steps) !== '' ? `
    <div style="border-left: 4px solid #ff6a00; padding-left: 20px; margin: 25px 0;">
      <div style="color: #4a5568; font-size: 15px; line-height: 1.7;">
        ${steps}
      </div>
    </div>
  ` : '';

  // Section 6: CTA Button
  const ctaButtonHtml = discountPercent === 0 ? '' : `
    <div style="text-align: center; margin: 30px 0 20px 0;">
      <a href="${isPreview ? '#' : ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #9c3b00 0%, #ff6a00 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px;">
        ${escapeHtml(buttonLabel.slice(0, 30))}
      </a>
      <p style="margin: 12px 0 0 0; color: #6c757d; font-size: 12px;">
        Отстъпката е валидна само чрез този бутон
      </p>
    </div>
  `;

  return `
${greetingHtml}  
${discountHeadingHtml}
${mainContentHtml}
${freeDeliveryHtml}
${stepsHtml}
${ctaButtonHtml}
  `.trim();
}

// ============================================================================
// Template Definition
// ============================================================================

export const discountTemplate: TemplateDefinition = {
  id: 'discount',
  name: 'Discount Campaign',
  description: 'Promotional email with discount offer, free delivery banner, and CTA button',
  variables: discountTemplateVariables,
  
  /**
   * Generate HTML for server-side sending
   * Includes actual unsubscribe URL and click token for attribution
   * 
   * @param variables - Template variables including email, campaignId, recipientId
   * @param campaignId - Campaign UUID for attribution
   * @param recipientId - Recipient UUID for attribution
   */
  generate(variables: DiscountCampaignVariables, campaignId?: string, recipientId?: string): string {
    const content = generateDiscountContent(variables, false, campaignId, recipientId);
    return wrapEmailContent(content, {
      unsubscribeUrl: variables.unsubscribe_url,
      isPreview: false,
    });
  },
  
  /**
   * Generate HTML for client-side preview
   * Shows placeholder for unsubscribe link, no attribution token
   */
  generatePreview(variables: DiscountCampaignVariables): string {
    const content = generateDiscountContent(variables, true);
    return wrapEmailContent(content, {
      isPreview: true,
    });
  },
};
