/**
 * Centralized label resolution for email templates.
 * Single source of truth - all email senders call this instead of
 * assembling label maps manually.
 */

import { getBoxTypeNames, getOptionLabels, getColorNames } from '@/lib/data/catalog';
import type { EmailLabelMaps } from './templates';

/**
 * Resolve all label maps needed for email personalization.
 * Fetches from database via catalog.ts (React.cache'd per request).
 * Call once per email-sending flow, then pass the result to template functions.
 */
export async function resolveEmailLabels(): Promise<EmailLabelMaps> {
  const [boxTypes, sports, flavors, dietary, colors, sizes] = await Promise.all([
    getBoxTypeNames(),
    getOptionLabels('sports'),
    getOptionLabels('flavors'),
    getOptionLabels('dietary'),
    getColorNames(),
    getOptionLabels('sizes'),
  ]);

  return { boxTypes, sports, flavors, dietary, colors, contents: {}, sizes };
}

/** Static display labels for subscription frequency values */
export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Месечна',
  seasonal: 'Сезонна',
};

/** Static display labels for subscription status values */
export const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  paused: 'На пауза',
  cancelled: 'Отменен',
};

/**
 * Build a human-readable list of personalization lines suitable for email templates.
 * Returns an empty array when personalization is not wanted.
 */
export function buildPersonalizationLines(
  prefs: {
    wants_personalization: boolean;
    sports?: string[] | null;
    sport_other?: string | null;
    colors?: string[] | null;
    flavors?: string[] | null;
    flavor_other?: string | null;
    dietary?: string[] | null;
    dietary_other?: string | null;
    size_upper?: string | null;
    size_lower?: string | null;
    additional_notes?: string | null;
  },
  labels: EmailLabelMaps,
): string[] {
  if (!prefs.wants_personalization) return [];
  const lines: string[] = [];
  if (prefs.sports?.length) {
    const names = prefs.sports.map((s) => labels.sports[s] ?? s);
    if (prefs.sport_other) names.push(prefs.sport_other);
    lines.push(`Спортове: ${names.join(', ')}`);
  }
  if (prefs.colors?.length) {
    lines.push(`Цветове: ${prefs.colors.map((c) => labels.colors[c] ?? c).join(', ')}`);
  }
  if (prefs.flavors?.length) {
    const names = prefs.flavors.map((f) => labels.flavors[f] ?? f);
    if (prefs.flavor_other) names.push(prefs.flavor_other);
    lines.push(`Вкусове: ${names.join(', ')}`);
  }
  if (prefs.size_upper) lines.push(`Размер (горна): ${labels.sizes[prefs.size_upper] ?? prefs.size_upper}`);
  if (prefs.size_lower) lines.push(`Размер (долна): ${labels.sizes[prefs.size_lower] ?? prefs.size_lower}`);
  if (prefs.dietary?.length) {
    const names = prefs.dietary.map((d) => labels.dietary[d] ?? d);
    if (prefs.dietary_other) names.push(prefs.dietary_other);
    lines.push(`Диета: ${names.join(', ')}`);
  }
  if (prefs.additional_notes) lines.push(`Бележки: ${prefs.additional_notes}`);
  return lines;
}
