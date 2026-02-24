/**
 * Order Formatting
 *
 * Format order data for display. Reuses price formatting from @/lib/preorder/format.
 */

import type { OrderStatus, ShippingAddressSnapshot } from '@/lib/supabase/types';

// ============================================================================
// Order Status Labels (Bulgarian)
// ============================================================================

/** Bulgarian labels for each order status */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Изчакваща',
  confirmed: 'Потвърдена',
  processing: 'В обработка',
  shipped: 'Изпратена',
  delivered: 'Доставена',
  cancelled: 'Отказана',
  refunded: 'Възстановена',
};

/** Tailwind text color classes for status badges */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-yellow-600',
  confirmed: 'text-blue-600',
  processing: 'text-indigo-600',
  shipped: 'text-purple-600',
  delivered: 'text-green-600',
  cancelled: 'text-red-600',
  refunded: 'text-gray-600',
};

// ============================================================================
// Status Formatting
// ============================================================================

/**
 * Get the Bulgarian label for an order status
 */
export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

/**
 * Format an order number for display.
 * Currently identity function — exists for future formatting changes.
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber;
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Format a shipping address as a multiline string.
 *
 * Example output:
 *   Иван Иванов
 *   ул. Витоша 1, Вход А, ет. 3, ап. 12
 *   1000 София
 */
export function formatShippingAddress(address: ShippingAddressSnapshot): string {
  const lines: string[] = [];

  // Line 1: Full name
  lines.push(address.full_name);

  // Line 2: Street + optional building details
  const streetParts: string[] = [address.street_address];
  if (address.building_entrance) streetParts.push(`Вход ${address.building_entrance}`);
  if (address.floor) streetParts.push(`ет. ${address.floor}`);
  if (address.apartment) streetParts.push(`ап. ${address.apartment}`);
  lines.push(streetParts.join(', '));

  // Line 3: Postal code + city
  lines.push(`${address.postal_code} ${address.city}`);

  return lines.join('\n');
}

/**
 * Format a shipping address as a single line for table rows.
 *
 * Example output:
 *   ул. Витоша 1, 1000 София
 */
export function formatShippingAddressOneLine(address: ShippingAddressSnapshot): string {
  const parts: string[] = [address.street_address];
  if (address.building_entrance) parts.push(`Вход ${address.building_entrance}`);
  if (address.floor) parts.push(`ет. ${address.floor}`);
  if (address.apartment) parts.push(`ап. ${address.apartment}`);
  parts.push(`${address.postal_code} ${address.city}`);
  return parts.join(', ');
}
