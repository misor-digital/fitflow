/**
 * Order Formatting
 *
 * Format order data for display. Reuses price formatting from @/lib/catalog/format.
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
  // Speedy office delivery
  if (address.delivery_method === 'speedy_office' && address.speedy_office_name) {
    const lines: string[] = [];
    lines.push(address.full_name);
    lines.push(`Офис на Speedy: ${address.speedy_office_name}`);
    if (address.speedy_office_address) {
      lines.push(address.speedy_office_address);
    }
    if (address.phone) {
      lines.push(`Тел: ${address.phone}`);
    }
    return lines.join('\n');
  }

  // Address delivery (existing logic)
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
  // Speedy office delivery
  if (address.delivery_method === 'speedy_office' && address.speedy_office_name) {
    return `Офис на Speedy: ${address.speedy_office_name}`;
  }

  // Address delivery (existing logic)
  const parts: string[] = [address.street_address];
  if (address.building_entrance) parts.push(`Вход ${address.building_entrance}`);
  if (address.floor) parts.push(`ет. ${address.floor}`);
  if (address.apartment) parts.push(`ап. ${address.apartment}`);
  parts.push(`${address.postal_code} ${address.city}`);
  return parts.join(', ');
}

// ============================================================================
// Timeline Constants (shared by guest tracking page & account detail page)
// ============================================================================

/** All possible statuses in logical order for timeline rendering */
export const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

/** Background colors for status badges (pill variant) */
export const STATUS_BG_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100',
  confirmed: 'bg-blue-100',
  processing: 'bg-indigo-100',
  shipped: 'bg-purple-100',
  delivered: 'bg-green-100',
  cancelled: 'bg-red-100',
  refunded: 'bg-gray-100',
};

// ============================================================================
// Order Type Labels (Bulgarian)
// ============================================================================

/** Bulgarian labels for each order type */
export const ORDER_TYPE_LABELS: Record<string, string> = {
  subscription: 'Абонаментна',
  'onetime-mystery': 'Мистери',
  'onetime-revealed': 'Разкрита',
  direct: 'Директна',
};

/** Tailwind badge classes for each order type */
export const ORDER_TYPE_COLORS: Record<string, string> = {
  subscription: 'bg-blue-100 text-blue-700',
  'onetime-mystery': 'bg-purple-100 text-purple-700',
  'onetime-revealed': 'bg-pink-100 text-pink-700',
  direct: 'bg-orange-100 text-orange-700',
};

// ============================================================================
// Delivery Method Formatting
// ============================================================================

/**
 * Get the Bulgarian label for a delivery method.
 */
export function formatDeliveryMethodLabel(method: 'address' | 'speedy_office' | undefined): string {
  switch (method) {
    case 'speedy_office':
      return 'До офис на Speedy';
    case 'address':
    default:
      return 'Доставка до адрес';
  }
}
