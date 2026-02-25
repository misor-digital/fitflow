/**
 * Preorder Campaign — Template Renderer
 *
 * Server-only module that reads the HTML template and renders it
 * with recipient-specific data. All user-provided values are HTML-escaped
 * to prevent XSS. The template uses Jinja-style {{ }} and {% %} syntax
 * which is rendered locally before sending to Brevo as final HTML.
 */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '@/lib/utils/sanitize';
import type { PreorderRecipient } from './recipients';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

/** Human-readable box type labels (Bulgarian) */
const BOX_TYPE_LABELS: Record<string, string> = {
  'monthly-standard': 'Стандартна',
  'monthly-premium': 'Премиум',
  'monthly-premium-monthly': 'Премиум (месечна)',
  'monthly-premium-seasonal': 'Премиум (сезонна)',
};

// ---------------------------------------------------------------------------
// Template loading (read once, cached in module scope)
// ---------------------------------------------------------------------------

let cachedTemplate: string | null = null;

function getTemplate(): string {
  if (cachedTemplate) return cachedTemplate;

  const templatePath = path.join(__dirname, 'templates', 'preorder-campaign-template.html');
  cachedTemplate = fs.readFileSync(templatePath, 'utf-8');
  return cachedTemplate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a price value as "XX.XX EUR" or fallback */
function formatPrice(
  finalPrice: number | null,
  originalPrice: number | null,
): string {
  const price = finalPrice ?? originalPrice;
  if (price == null) return '—';
  return `${price.toFixed(2)} EUR`;
}

/** Split full name into first and last name parts */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/** Build a display string for sports, appending sportOther if provided */
function formatSports(sports: string[] | null, sportOther: string | null): string {
  if (!sports?.length) return '—';
  let result = sports.join(', ');
  if (sportOther) result += ` (${sportOther})`;
  return result;
}

/** Build a display string for flavors, appending flavorOther if provided */
function formatFlavors(flavors: string[] | null, flavorOther: string | null): string {
  if (!flavors?.length) return '—';
  let result = flavors.join(', ');
  if (flavorOther) result += ` (${flavorOther})`;
  return result;
}

/** Build a display string for sizes */
function formatSize(upper: string | null, lower: string | null): string {
  if (!upper && !lower) return '—';
  return [upper, lower].filter(Boolean).join(' / ');
}

/** Build a display string for dietary restrictions, appending dietaryOther */
function formatDietary(dietary: string[] | null, dietaryOther: string | null): string {
  if (!dietary?.length) return 'Няма';
  let result = dietary.join(', ');
  if (dietaryOther) result += ` (${dietaryOther})`;
  return result;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Render the preorder conversion email template with recipient-specific data.
 *
 * - All user-provided values are HTML-escaped to prevent XSS.
 * - The conversion URL is NOT escaped (validated to start with SITE_URL instead).
 * - Conditional {% if %} blocks are resolved based on personalization status.
 */
export function renderPreorderEmail(recipient: PreorderRecipient): string {
  let html = getTemplate();

  const { firstName, lastName } = splitName(recipient.fullName);
  const personalizationValue = recipient.wantsPersonalization ? 'да' : 'не';
  const boxLabel = BOX_TYPE_LABELS[recipient.boxType] ?? recipient.boxType;
  const priceStr = formatPrice(recipient.finalPriceEur, recipient.originalPriceEur);

  // Validate conversion URL starts with SITE_URL
  if (!recipient.conversionUrl.startsWith(SITE_URL)) {
    throw new Error(
      `Invalid conversion URL: expected to start with ${SITE_URL}, got ${recipient.conversionUrl}`,
    );
  }

  // --- Simple placeholder replacements (escaped) ---
  const replacements: [string, string][] = [
    ['{{ contact.FIRSTNAME }}', escapeHtml(firstName)],
    ['{{ contact.LASTNAME }}', escapeHtml(lastName)],
    ['{{ preorder_number }}', escapeHtml(recipient.orderId)],
    ['{{ box_name }}', escapeHtml(boxLabel)],
    ['{{ box_price }}', escapeHtml(priceStr)],
    ['{{ personalization }}', escapeHtml(personalizationValue)],
    ['{{ sport }}', escapeHtml(formatSports(recipient.sports, recipient.sportOther))],
    ['{{ colors }}', escapeHtml(recipient.colors?.join(', ') || '—')],
    ['{{ flavors }}', escapeHtml(formatFlavors(recipient.flavors, recipient.flavorOther))],
    ['{{ size }}', escapeHtml(formatSize(recipient.sizeUpper, recipient.sizeLower))],
    ['{{ dietary_restrictions }}', escapeHtml(formatDietary(recipient.dietary, recipient.dietaryOther))],
    // URL is NOT escaped — validated above instead
    ['{{ custom_link }}', recipient.conversionUrl],
  ];

  for (const [placeholder, value] of replacements) {
    // Replace all occurrences of each placeholder
    html = html.replaceAll(placeholder, value);
  }

  // --- Conditional block: {% if personalization == "да" ... %}...{% endif %} ---
  html = html.replace(
    /\{%\s*if\s+personalization\s*==.*?%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
    (_match, innerContent: string) => {
      return recipient.wantsPersonalization ? innerContent : '';
    },
  );

  return html;
}
