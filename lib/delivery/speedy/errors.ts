import 'server-only';

import { SpeedyApiError } from './client';

const ALREADY_ORDERED_KEYWORDS = ['поръч', 'заяв', 'взет', 'приет', 'ordered', 'picked', 'collected'];
const ACCESS_KEYWORDS = ['достъп', 'права', 'access', 'permission'];
const NOT_FOUND_KEYWORDS = ['не е намер', 'несъществ', 'not found', 'invalid'];

/**
 * Map a Speedy cancellation error to a Bulgarian admin-facing message.
 *
 * Speedy answers in the request language (BG). The Bulgarian keywords are
 * best-effort until confirmed against the Speedy test account; anything
 * unmatched is shown verbatim with a "Speedy:" prefix.
 */
export function mapCancelError(err: unknown): string {
  if (!(err instanceof SpeedyApiError)) {
    return 'Грешка при анулиране.';
  }

  const message = err.message;
  const lower = message.toLowerCase();
  const matches = (keywords: string[]) => keywords.some((k) => lower.includes(k));

  if (matches(ALREADY_ORDERED_KEYWORDS)) {
    return 'Пратката вече е заявена за взимане или е взета от куриер. Анулирането не е възможно.';
  }
  if (matches(ACCESS_KEYWORDS)) {
    return 'Нямате достъп до тази пратка в Speedy.';
  }
  if (matches(NOT_FOUND_KEYWORDS)) {
    return 'Невалиден номер на товарителница.';
  }
  return `Speedy: ${message}`;
}
