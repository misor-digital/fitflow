/**
 * Order-to-Subscription Campaign — Template Renderer
 *
 * Server-only module that reads the HTML template and renders it
 * with recipient-specific data via Mustache.
 *
 * - `{{var}}` placeholders are auto-escaped by Mustache (XSS-safe).
 * - `{{{var}}}` (triple-stache) is used for the pre-validated conversion URL.
 * - `{{#flag}}...{{/flag}}` sections handle conditional blocks.
 */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import Mustache from 'mustache';
import type { OrderConversionRecipient } from './recipients';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LabelMaps {
  sportLabels: Record<string, string>;
  flavorLabels: Record<string, string>;
  dietaryLabels: Record<string, string>;
  sizeLabels: Record<string, string>;
  colorNames: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

// ---------------------------------------------------------------------------
// Template loading (read once, cached in module scope)
// ---------------------------------------------------------------------------

let cachedTemplate: string | null = null;

function getTemplate(): string {
  if (cachedTemplate) return cachedTemplate;

  const templatePath = path.join(
    process.cwd(),
    'lib',
    'email',
    'order-subscription-campaign',
    'templates',
    'order-subscription-campaign-template.html',
  );
  cachedTemplate = fs.readFileSync(templatePath, 'utf-8');
  return cachedTemplate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a price value as "XX.XX € / XX.XX лв" dual-currency or fallback */
function formatPrice(
  finalPriceEur: number,
  originalPriceEur: number,
  finalPriceBgn: number,
  originalPriceBgn: number,
): string {
  const eur = finalPriceEur || originalPriceEur;
  const bgn = finalPriceBgn || originalPriceBgn;
  if (!eur) return '—';
  if (bgn) {
    return `${eur.toFixed(2)} € / ${bgn.toFixed(2)} лв`;
  }
  return `${eur.toFixed(2)} €`;
}

/** Split full name into first and last name parts */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/** Build a display string for sizes */
function formatSize(upper: string | null, lower: string | null): string {
  if (!upper && !lower) return '—';
  return [upper, lower].filter(Boolean).join(' / ');
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Render the order-to-subscription conversion email template.
 *
 * - `{{var}}` values are auto-escaped by Mustache to prevent XSS.
 * - The conversion URL uses `{{{custom_link}}}` (triple-stache, unescaped)
 *   and is validated to start with SITE_URL before rendering.
 * - `{{#has_promo}}...{{/has_promo}}` sections are conditionally rendered.
 */
/** Map raw values to Bulgarian labels using catalog label maps */
function mapLabels(values: string[] | null, labels: Record<string, string>): string {
  if (!values || values.length === 0) return '—';
  return values.map((v) => labels[v] ?? v).join(', ');
}

export function renderOrderConversionEmail(
  recipient: OrderConversionRecipient,
  labelMaps: LabelMaps,
  campaignPromoCode?: string,
): string {
  const template = getTemplate();

  const { firstName, lastName } = splitName(recipient.fullName);

  // Validate conversion URL starts with SITE_URL
  if (!recipient.conversionUrl.startsWith(SITE_URL)) {
    throw new Error(
      `Invalid conversion URL: expected to start with ${SITE_URL}, got ${recipient.conversionUrl}`,
    );
  }

  return Mustache.render(template, {
    firstName,
    lastName,
    order_number: recipient.orderNumber,
    box_name: recipient.boxName,
    box_price: formatPrice(
      recipient.finalPriceEur,
      recipient.originalPriceEur,
      recipient.finalPriceBgn,
      recipient.originalPriceBgn,
    ),
    personalization: recipient.wantsPersonalization ? 'да' : 'не',
    wantsPersonalization: recipient.wantsPersonalization,
    sport: mapLabels(recipient.sports, labelMaps.sportLabels),
    colors: mapLabels(recipient.colors, labelMaps.colorNames),
    flavors: mapLabels(recipient.flavors, labelMaps.flavorLabels),
    size: formatSize(
      recipient.sizeUpper ? (labelMaps.sizeLabels[recipient.sizeUpper] ?? recipient.sizeUpper) : null,
      recipient.sizeLower ? (labelMaps.sizeLabels[recipient.sizeLower] ?? recipient.sizeLower) : null,
    ),
    dietary_restrictions: mapLabels(recipient.dietary, labelMaps.dietaryLabels) || 'Няма',
    has_promo: !!campaignPromoCode,
    promo_code: campaignPromoCode ?? '',
    promo_discount: campaignPromoCode ? 'допълнителна' : '',
    // Used as {{{custom_link}}} in template — unescaped, validated above
    custom_link: recipient.conversionUrl,
  });
}
