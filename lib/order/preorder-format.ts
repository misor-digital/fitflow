/**
 * Preorder formatting constants
 *
 * Shared preorder status labels and colors used across account pages.
 */

import type { PreorderConversionStatus } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Status labels (Bulgarian)
// ---------------------------------------------------------------------------

export const PREORDER_STATUS_LABELS: Record<PreorderConversionStatus, string> = {
  pending: 'Изчакваща',
  converted: 'Конвертирана',
  expired: 'Изтекла',
};

// ---------------------------------------------------------------------------
// Status badge colors (Tailwind classes)
// ---------------------------------------------------------------------------

export const PREORDER_STATUS_COLORS: Record<PreorderConversionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
};
