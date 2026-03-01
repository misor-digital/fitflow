/**
 * Centralized label resolution for email templates.
 * Single source of truth — all email senders call this instead of
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
  const [boxTypes, sports, flavors, dietary, colors] = await Promise.all([
    getBoxTypeNames(),
    getOptionLabels('sports'),
    getOptionLabels('flavors'),
    getOptionLabels('dietary'),
    getColorNames(),
  ]);

  return { boxTypes, sports, flavors, dietary, colors, contents: {} };
}

/** Static display labels for subscription frequency values */
export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Месечен',
  seasonal: 'Сезонен',
};

/** Static display labels for subscription status values */
export const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  paused: 'На пауза',
  cancelled: 'Отменен',
};
