/**
 * Speedy date helpers. Generic Europe/Sofia helpers live in `@/lib/utils/sofia-time`.
 */

import { normalizeHHmm, sofiaOffset, sofiaWallTimeToDate } from '@/lib/utils/sofia-time';

export {
  HHMM_PATTERN,
  isValidYmd,
  normalizeHHmm,
  nowSofiaHHmm,
  sofiaOffset,
  todaySofia,
} from '@/lib/utils/sofia-time';

/**
 * Build a Speedy date-time (`yyyy-MM-dd'T'HH:mm:ssZ`) for a Sofia local date and time,
 * using the Sofia offset valid at that moment (handles DST).
 */
export function toSpeedyDateTime(dateYmd: string, hhmm: string): string {
  const time = normalizeHHmm(hhmm);
  return `${dateYmd}T${time}:00${sofiaOffset(sofiaWallTimeToDate(dateYmd, time))}`;
}
