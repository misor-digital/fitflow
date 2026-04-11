/**
 * Shared date/time formatting utilities (Bulgarian locale).
 *
 * Import from '@/lib/utils/date' everywhere instead of defining local helpers.
 */

// ---------------------------------------------------------------------------
// Short numeric formats
// ---------------------------------------------------------------------------

/** DD.MM.YYYY — e.g. `08.03.2026` */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** DD.MM.YYYY, HH:mm — e.g. `08.03.2026, 14:30` */
export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** DD.MM — e.g. `08.03` (compact, no year) */
export function formatDateCompact(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Long (human-friendly) formats
// ---------------------------------------------------------------------------

/** 1 март 2026 г. */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** 1 март 2026 г., 14:30 */
export function formatDateTimeLong(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

/** преди X мин. / ч. / дни — falls back to formatDateTimeShort after 30 days */
export function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;

  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'току-що';
  if (minutes < 60) return `преди ${minutes} мин.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `преди ${hours} ч.`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'преди 1 ден';
  if (days <= 30) return `преди ${days} дни`;

  return formatDateTimeShort(iso);
}
