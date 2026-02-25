/**
 * Delivery Cycle Derived State
 *
 * Pure functions for delivery date calculation, cycle state, and formatting.
 * No database or API calls — all inputs are passed as arguments.
 */

import type {
  DeliveryCycleRow,
  DeliveryCycleDerivedState,
  DeliveryConfig,
  DeliveryCycleStatus,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const MS_PER_DAY = 86_400_000;

/** Bulgarian month names (index 0 = January) */
export const BULGARIAN_MONTHS: string[] = [
  'Януари',
  'Февруари',
  'Март',
  'Април',
  'Май',
  'Юни',
  'Юли',
  'Август',
  'Септември',
  'Октомври',
  'Ноември',
  'Декември',
];

/** Human-readable status labels in Bulgarian */
export const CYCLE_STATUS_LABELS: Record<DeliveryCycleStatus, string> = {
  upcoming: 'Предстоящ',
  delivered: 'Доставен',
  archived: 'Архивиран',
};

/** Tailwind color classes per status */
export const CYCLE_STATUS_COLORS: Record<DeliveryCycleStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// Config Parsing
// ============================================================================

/**
 * Parse raw site_config key-value pairs into a typed DeliveryConfig object.
 *
 * Expected keys:
 * - SUBSCRIPTION_DELIVERY_DAY  → deliveryDay (1-28, default 5)
 * - FIRST_DELIVERY_DATE        → firstDeliveryDate (ISO date or null)
 * - SUBSCRIPTION_ENABLED       → subscriptionEnabled (default true)
 * - REVEALED_BOX_ENABLED       → revealedBoxEnabled (default false)
 */
export function getDeliveryConfig(
  configMap: Record<string, string | null>,
): DeliveryConfig {
  const rawDay = configMap.SUBSCRIPTION_DELIVERY_DAY;
  let deliveryDay = 5;
  if (rawDay) {
    const parsed = parseInt(rawDay, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 28) {
      deliveryDay = parsed;
    }
  }

  return {
    deliveryDay,
    firstDeliveryDate: configMap.FIRST_DELIVERY_DATE ?? null,
    subscriptionEnabled:
      configMap.SUBSCRIPTION_ENABLED?.toLowerCase() !== 'false',
    revealedBoxEnabled:
      configMap.REVEALED_BOX_ENABLED?.toLowerCase() === 'true',
  };
}

// ============================================================================
// Date Calculation
// ============================================================================

/**
 * Get the last day of a given month (handles Feb, leap years, etc.).
 */
function lastDayOfMonth(year: number, month: number): number {
  // month is 0-based (0 = Jan). Day 0 of next month = last day of this month.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Build a local-midnight Date for a specific year/month/day, clamping the day
 * to the last valid day of that month.
 */
function buildDate(year: number, month: number, day: number): Date {
  const clamped = Math.min(day, lastDayOfMonth(year, month));
  return new Date(year, month, clamped);
}

/**
 * Strip time from a Date, returning midnight in local time.
 */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calculate the next delivery date based on configuration.
 *
 * Rules:
 * 1. If `firstDeliveryDate` is set and in the future → return that date.
 * 2. Otherwise, find the next `deliveryDay`th that is in the future.
 *    - If today < deliveryDay of current month → this month
 *    - If today >= deliveryDay of current month → next month
 * 3. If `deliveryDay > 28`, clamp to the last day of the target month.
 */
export function calculateNextDeliveryDate(
  config: DeliveryConfig,
  fromDate?: Date,
): Date {
  const now = fromDate ? startOfDay(fromDate) : startOfDay(new Date());

  // Check first-delivery override
  if (config.firstDeliveryDate) {
    const first = parseISODate(config.firstDeliveryDate);
    if (first && first >= now) {
      return first;
    }
  }

  // Normal calculation
  const year = now.getFullYear();
  const month = now.getMonth();

  const thisMonth = buildDate(year, month, config.deliveryDay);
  if (thisMonth > now) {
    return thisMonth;
  }

  // Move to next month
  if (month === 11) {
    return buildDate(year + 1, 0, config.deliveryDay);
  }
  return buildDate(year, month + 1, config.deliveryDay);
}

/**
 * Return the next `n` delivery dates starting from `fromDate`.
 * Used for admin cycle creation suggestions.
 */
export function calculateNextNDeliveryDates(
  config: DeliveryConfig,
  n: number,
  fromDate?: Date,
): Date[] {
  if (n <= 0) return [];

  const dates: Date[] = [];

  // First date uses the full logic (including first-delivery override)
  const first = calculateNextDeliveryDate(config, fromDate);
  dates.push(first);

  // Subsequent dates: step month-by-month from the first date
  let year = first.getFullYear();
  let month = first.getMonth();

  for (let i = 1; i < n; i++) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    dates.push(buildDate(year, month, config.deliveryDay));
  }

  return dates;
}

/**
 * Returns true if `firstDeliveryDate` is set AND that date is in the future.
 */
export function isFirstDelivery(
  config: DeliveryConfig,
  now?: Date,
): boolean {
  if (!config.firstDeliveryDate) return false;
  const first = parseISODate(config.firstDeliveryDate);
  if (!first) return false;
  const today = now ? startOfDay(now) : startOfDay(new Date());
  return first >= today;
}

// ============================================================================
// Cycle State
// ============================================================================

/**
 * Compute all derived fields from a delivery cycle row.
 */
export function computeCycleState(
  cycle: DeliveryCycleRow,
  now?: Date,
): DeliveryCycleDerivedState {
  const today = now ? startOfDay(now) : startOfDay(new Date());
  const deliveryDate = parseISODate(cycle.delivery_date) ?? today;

  const isPast = deliveryDate < today;
  const isUpcoming = deliveryDate >= today && cycle.status === 'upcoming';
  const isRevealed = cycle.is_revealed;
  const canReveal = cycle.status === 'delivered' && !cycle.is_revealed;
  const canMarkDelivered = cycle.status === 'upcoming';

  let daysUntilDelivery: number | null = null;
  if (!isPast) {
    daysUntilDelivery = Math.ceil(
      (deliveryDate.getTime() - today.getTime()) / MS_PER_DAY,
    );
  }

  return {
    isPast,
    isUpcoming,
    isRevealed,
    canReveal,
    canMarkDelivered,
    daysUntilDelivery,
    formattedDate: formatDeliveryDate(cycle.delivery_date),
    monthYear: formatMonthYear(cycle.delivery_date),
  };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Parse an ISO date string (YYYY-MM-DD) into a local-midnight Date.
 * Returns null if the string is falsy or unparseable.
 */
function parseISODate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Split to avoid timezone offset issues with `new Date('YYYY-MM-DD')`
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Format an ISO date string as DD.MM.YYYY (Bulgarian convention).
 *
 * @example formatDeliveryDate('2026-03-08') → '08.03.2026'
 */
export function formatDeliveryDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  if (!date) return dateStr;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Format an ISO date string as "Март 2026" (Bulgarian month + year).
 *
 * @example formatMonthYear('2026-03-08') → 'Март 2026'
 */
export function formatMonthYear(dateStr: string): string {
  const date = parseISODate(dateStr);
  if (!date) return dateStr;
  return `${BULGARIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
