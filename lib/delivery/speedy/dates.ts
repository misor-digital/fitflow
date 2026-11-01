/**
 * Europe/Sofia date helpers for Speedy requests (no external deps).
 */

const SOFIA_TZ = 'Europe/Sofia';

function sofiaParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** UTC offset of Europe/Sofia at the given instant, e.g. `+0200` or `+0300`. */
export function sofiaOffset(date: Date): string {
  const tzName =
    new Intl.DateTimeFormat('en-US', { timeZone: SOFIA_TZ, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tzName);
  if (!match) return '+0000';
  return `${match[1]}${match[2].padStart(2, '0')}${match[3] ?? '00'}`;
}

/** Today's date in Sofia as `YYYY-MM-DD`. */
export function todaySofia(now: Date = new Date()): string {
  const p = sofiaParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Current Sofia time rounded up to the next full minute, as `HH:mm`. */
export function nowSofiaHHmm(now: Date = new Date()): { date: string; time: string } {
  const rounded = new Date(Math.ceil((now.getTime() + 1) / 60_000) * 60_000);
  const p = sofiaParts(rounded);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Strict `YYYY-MM-DD` check that also rejects impossible dates. */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const HHMM_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Normalise `H:mm` / `HH:mm` to `HH:mm`. */
export function normalizeHHmm(value: string): string {
  const [h, m] = value.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

/**
 * Build a Speedy date-time (`yyyy-MM-dd'T'HH:mm:ssZ`) for a Sofia local date and time,
 * using the Sofia offset valid at that moment (handles DST).
 */
export function toSpeedyDateTime(dateYmd: string, hhmm: string): string {
  const [y, mo, d] = dateYmd.split('-').map(Number);
  const [h, mi] = normalizeHHmm(hhmm).split(':').map(Number);
  // Sofia is UTC+2 or UTC+3; probing at UTC+2 lands within the correct DST period for daytime hours
  const probe = new Date(Date.UTC(y, mo - 1, d, h - 2, mi));
  return `${dateYmd}T${normalizeHHmm(hhmm)}:00${sofiaOffset(probe)}`;
}
