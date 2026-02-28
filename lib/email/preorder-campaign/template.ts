/**
 * Preorder Campaign — Template Renderer
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

  const templatePath = path.join(
    process.cwd(),
    'lib',
    'email',
    'preorder-campaign',
    'templates',
    'preorder-campaign-template.html',
  );
  cachedTemplate = fs.readFileSync(templatePath, 'utf-8');
  return cachedTemplate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a price value as "XX.XX € / XX.XX лв" dual-currency or fallback */
function formatPrice(
  finalPriceEur: number | null,
  originalPriceEur: number | null,
  finalPriceBgn: number | null,
  originalPriceBgn: number | null,
): string {
  const eur = finalPriceEur ?? originalPriceEur;
  const bgn = finalPriceBgn ?? originalPriceBgn;
  if (eur == null) return '—';
  if (bgn != null) {
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
 * - `{{var}}` values are auto-escaped by Mustache to prevent XSS.
 * - The conversion URL uses `{{{custom_link}}}` (triple-stache, unescaped)
 *   and is validated to start with SITE_URL before rendering.
 * - `{{#wantsPersonalization}}...{{/wantsPersonalization}}` sections are
 *   conditionally rendered by Mustache.
 */
export function renderPreorderEmail(recipient: PreorderRecipient): string {
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
    preorder_number: recipient.orderId,
    box_name: BOX_TYPE_LABELS[recipient.boxType] ?? recipient.boxType,
    box_price: formatPrice(recipient.finalPriceEur, recipient.originalPriceEur, recipient.finalPriceBgn, recipient.originalPriceBgn),
    personalization: recipient.wantsPersonalization ? 'да' : 'не',
    wantsPersonalization: recipient.wantsPersonalization,
    sport: formatSports(recipient.sports, recipient.sportOther),
    colors: recipient.colors?.join(', ') || '—',
    flavors: formatFlavors(recipient.flavors, recipient.flavorOther),
    size: formatSize(recipient.sizeUpper, recipient.sizeLower),
    dietary_restrictions: formatDietary(recipient.dietary, recipient.dietaryOther),
    // Used as {{{custom_link}}} in template — unescaped, validated above
    custom_link: recipient.conversionUrl,
  });
}
