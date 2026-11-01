/**
 * Europe/Sofia time helpers (no external deps, safe for client and server).
 *
 * FitFlow operates in Bulgaria, so admin-entered wall-clock times (cycle cutoffs,
 * courier pickups) and "today" must mean Bulgarian time regardless of the
 * server's time zone (UTC in production) or the visitor's browser.
 */

export const SOFIA_TZ = 'Europe/Sofia';

export const HHMM_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;
const DATETIME_LOCAL_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/;

export interface SofiaDateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

/** Wall-clock components of an instant in Europe/Sofia (zero-padded). */
export function sofiaParts(date: Date): SofiaDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** Europe/Sofia UTC offset in minutes at the given instant (120 or 180). */
function sofiaOffsetMinutes(date: Date): number {
  const tzName =
    new Intl.DateTimeFormat('en-US', { timeZone: SOFIA_TZ, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tzName);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

/** UTC offset of Europe/Sofia at the given instant, e.g. `+0200` or `+0300`. */
export function sofiaOffset(date: Date): string {
  const total = sofiaOffsetMinutes(date);
  const sign = total < 0 ? '-' : '+';
  const abs = Math.abs(total);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
}

/** Today's date in Sofia as `YYYY-MM-DD`. */
export function todaySofia(now: Date = new Date()): string {
  const p = sofiaParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Today in Sofia as a local-midnight Date, for date math that works on
 * local Date components (e.g. delivery date calculation).
 */
export function todaySofiaAsLocalDate(now: Date = new Date()): Date {
  const [y, m, d] = todaySofia(now).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Current Sofia time rounded up to the next full minute, as `HH:mm`. */
export function nowSofiaHHmm(now: Date = new Date()): { date: string; time: string } {
  const rounded = new Date(Math.ceil((now.getTime() + 1) / 60_000) * 60_000);
  const p = sofiaParts(rounded);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** `YYYY-MM-DD` from a Date's local components (no UTC conversion). */
export function toLocalYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Strict `YYYY-MM-DD` check that also rejects impossible dates. */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Normalise `H:mm` / `HH:mm` to `HH:mm`. */
export function normalizeHHmm(value: string): string {
  const [h, m] = value.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

/** The instant at which the Sofia wall clock shows `dateYmd hhmm` (handles DST). */
export function sofiaWallTimeToDate(dateYmd: string, hhmm: string): Date {
  const [y, mo, d] = dateYmd.split('-').map(Number);
  const [h, mi] = normalizeHHmm(hhmm).split(':').map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let ts = wallAsUtc - sofiaOffsetMinutes(new Date(wallAsUtc)) * 60_000;
  // Re-check: the offset can differ on the other side of a DST switch
  const corrected = wallAsUtc - sofiaOffsetMinutes(new Date(ts)) * 60_000;
  if (corrected !== ts) ts = corrected;
  return new Date(ts);
}

/**
 * Parse a `datetime-local` value (`YYYY-MM-DDTHH:mm`) as Sofia wall time.
 * Strings that already carry a zone (`Z` / `+02:00`) are parsed as absolute instants.
 * Returns null when invalid.
 */
export function parseSofiaDateTimeLocal(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const match = DATETIME_LOCAL_PATTERN.exec(value);
  if (match) {
    if (!isValidYmd(match[1]) || !HHMM_PATTERN.test(match[2])) return null;
    return sofiaWallTimeToDate(match[1], match[2]);
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** An instant as a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in Sofia time. */
export function toSofiaDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const p = sofiaParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
