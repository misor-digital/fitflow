'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ORDER_STATUS_LABELS,
  formatOrderNumber,
  formatShippingAddress,
  formatDeliveryMethodLabel,
} from '@/lib/order';
import { formatPriceDual } from '@/lib/catalog';
import type {
  OrderRow,
  Preorder,
  OrderStatus,
  PreorderConversionStatus,
} from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderFilter = 'all' | 'preorder' | 'subscription' | 'onetime';

type UnifiedItem =
  | { type: 'order'; data: OrderRow }
  | { type: 'preorder'; data: Preorder };

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { key: OrderFilter; label: string }[] = [
  { key: 'all', label: 'Всички' },
  { key: 'preorder', label: 'Предварителни' },
  { key: 'subscription', label: 'Абонаментни' },
  { key: 'onetime', label: 'Еднократни' },
];

// ---------------------------------------------------------------------------
// Preorder status labels & colors
// ---------------------------------------------------------------------------

const PREORDER_STATUS_LABELS: Record<PreorderConversionStatus, string> = {
  pending: 'Изчакваща',
  converted: 'Конвертирана',
  expired: 'Изтекла',
};

const PREORDER_STATUS_COLORS: Record<PreorderConversionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
};

// ---------------------------------------------------------------------------
// Order‑type labels
// ---------------------------------------------------------------------------

const ORDER_TYPE_LABELS: Record<string, string> = {
  subscription: 'Абонаментна',
  'onetime-mystery': 'Мистери',
  'onetime-revealed': 'Разкрита',
  direct: 'Директна',
};

// Badge bg colors per order type
const ORDER_TYPE_COLORS: Record<string, string> = {
  subscription: 'bg-blue-100 text-blue-700',
  'onetime-mystery': 'bg-purple-100 text-purple-700',
  'onetime-revealed': 'bg-pink-100 text-pink-700',
  direct: 'bg-orange-100 text-orange-700',
};

// Status badge bg colors (pill variant)
const ORDER_STATUS_BG: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const ONETIME_TYPES = new Set(['onetime-mystery', 'onetime-revealed', 'direct']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dualPrice(eur: number, rate: number): string {
  return formatPriceDual(eur, eur * rate);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrdersListProps {
  orders: OrderRow[];
  preorders: Preorder[];
  boxTypeNames: Record<string, string>;
  eurToBgnRate: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrdersList({
  orders,
  preorders,
  boxTypeNames,
  eurToBgnRate,
}: OrdersListProps) {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Counts per tab (unfiltered data)
  const counts = useMemo(() => {
    const subscriptionOrders = orders.filter(
      (o) => o.order_type === 'subscription',
    );
    const onetimeOrders = orders.filter((o) => ONETIME_TYPES.has(o.order_type));
    return {
      all: orders.length + preorders.length,
      preorder: preorders.length,
      subscription: subscriptionOrders.length,
      onetime: onetimeOrders.length,
    };
  }, [orders, preorders]);

  // Filtered items
  const items: UnifiedItem[] = useMemo(() => {
    switch (activeFilter) {
      case 'preorder':
        return preorders.map((p) => ({ type: 'preorder' as const, data: p }));
      case 'subscription':
        return orders
          .filter((o) => o.order_type === 'subscription')
          .map((o) => ({ type: 'order' as const, data: o }));
      case 'onetime':
        return orders
          .filter((o) => ONETIME_TYPES.has(o.order_type))
          .map((o) => ({ type: 'order' as const, data: o }));
      case 'all':
      default: {
        const merged: UnifiedItem[] = [
          ...orders.map((o) => ({ type: 'order' as const, data: o })),
          ...preorders.map((p) => ({ type: 'preorder' as const, data: p })),
        ];
        merged.sort(
          (a, b) =>
            new Date(b.data.created_at).getTime() -
            new Date(a.data.created_at).getTime(),
        );
        return merged;
      }
    }
  }, [orders, preorders, activeFilter]);

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  // ------------------------------------------------------------------
  // Empty states per tab
  // ------------------------------------------------------------------

  function renderEmpty() {
    switch (activeFilter) {
      case 'all':
        return (
          <div className="text-center py-12 text-gray-500">
            <p>Нямате поръчки все още.</p>
            <Link
              href="/order"
              className="mt-3 inline-block text-[var(--color-brand-orange)] font-medium hover:underline"
            >
              Разгледайте нашите кутии &rarr;
            </Link>
          </div>
        );
      case 'preorder':
        return (
          <p className="text-center py-12 text-gray-500">
            Нямате предварителни поръчки.
          </p>
        );
      case 'subscription':
        return (
          <div className="text-center py-12 text-gray-500">
            <p>Нямате абонаментни поръчки.</p>
            <Link
              href="/account/subscriptions"
              className="mt-3 inline-block text-[var(--color-brand-orange)] font-medium hover:underline"
            >
              Управление на абонаменти &rarr;
            </Link>
          </div>
        );
      case 'onetime':
        return (
          <div className="text-center py-12 text-gray-500">
            <p>Нямате еднократни поръчки.</p>
            <Link
              href="/box/mystery"
              className="mt-3 inline-block text-[var(--color-brand-orange)] font-medium hover:underline"
            >
              Поръчайте мистери кутия &rarr;
            </Link>
          </div>
        );
    }
  }

  // ------------------------------------------------------------------
  // Order card
  // ------------------------------------------------------------------

  function renderOrderCard(order: OrderRow) {
    const isExpanded = expandedId === order.id;
    const statusKey = order.status as OrderStatus;

    return (
      <div
        key={order.id}
        className="bg-white rounded-xl shadow-sm border p-4 sm:p-5"
      >
        {/* Header row */}
        <button
          type="button"
          onClick={() => toggleExpand(order.id)}
          className="w-full text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Left: order number + date */}
            <div>
              <span className="font-bold font-mono text-[var(--color-brand-navy)]">
                {formatOrderNumber(order.order_number)}
              </span>
              <span className="ml-2 text-sm text-gray-400">
                {formatDate(order.created_at)}
              </span>
            </div>

            {/* Right: badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status pill */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_BG[statusKey] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {ORDER_STATUS_LABELS[statusKey] ?? order.status}
              </span>

              {/* Order type badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_TYPE_COLORS[order.order_type] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
              </span>
            </div>
          </div>

          {/* Second row: box type + price */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
            <span className="text-gray-600">
              {boxTypeNames[order.box_type] ?? order.box_type}
            </span>
            {order.final_price_eur != null && (
              <span className="font-semibold text-[var(--color-brand-navy)]">
                {dualPrice(order.final_price_eur, eurToBgnRate)}
              </span>
            )}
          </div>
        </button>

        {/* Track link (always visible) */}
        <div className="mt-3 flex items-center gap-3 text-sm">
          <Link
            href={`/order/track?order=${encodeURIComponent(order.order_number)}`}
            className="text-[var(--color-brand-orange)] font-medium hover:underline"
          >
            Проследяване &rarr;
          </Link>
        </div>

        {/* Expandable detail */}
        {isExpanded && (
          <div className="mt-4 border-t pt-4 text-sm text-gray-600 space-y-2">
            <div>
              <span className="font-medium text-gray-700">Адрес за доставка:</span>
              <pre className="whitespace-pre-wrap mt-1 text-xs">
                {formatShippingAddress(order.shipping_address)}
              </pre>
            </div>
            <div>
              <span className="font-medium text-gray-700">Метод на доставка:</span>{' '}
              {formatDeliveryMethodLabel(order.delivery_method)}
            </div>
            {order.promo_code && (
              <div>
                <span className="font-medium text-gray-700">Промо код:</span>{' '}
                {order.promo_code}
                {order.discount_percent
                  ? ` (-${order.discount_percent}%)`
                  : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Preorder card
  // ------------------------------------------------------------------

  function renderPreorderCard(preorder: Preorder) {
    const statusKey = preorder.conversion_status;

    return (
      <div
        key={preorder.id}
        className="bg-white rounded-xl shadow-sm border p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="font-semibold text-[var(--color-brand-navy)]">
              Предварителна поръчка
            </span>
            <span className="ml-2 text-sm text-gray-400">
              {formatDate(preorder.created_at)}
            </span>
          </div>

          {/* Conversion status pill */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PREORDER_STATUS_COLORS[statusKey]}`}
          >
            {PREORDER_STATUS_LABELS[statusKey]}
          </span>
        </div>

        {/* Box type + price */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
          <span className="text-gray-600">
            {boxTypeNames[preorder.box_type] ?? preorder.box_type}
          </span>
          {preorder.final_price_eur != null && (
            <span className="font-semibold text-[var(--color-brand-navy)]">
              {dualPrice(preorder.final_price_eur, eurToBgnRate)}
            </span>
          )}
        </div>

        {/* Linked order link */}
        {preorder.converted_to_order_id && (
          <div className="mt-3 text-sm">
            <Link
              href={`/order/track?order=${encodeURIComponent(preorder.converted_to_order_id)}`}
              className="text-[var(--color-brand-orange)] font-medium hover:underline"
            >
              Виж поръчка &rarr;
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-4 mb-6 border-b pb-3 overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`text-sm font-medium pb-1 whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[var(--color-brand-orange)] border-b-2 border-[var(--color-brand-orange)]'
                  : 'text-gray-500 hover:text-[var(--color-brand-navy)]'
              }`}
            >
              {label} ({counts[key]})
            </button>
          );
        })}
      </div>

      {/* List or empty state */}
      {items.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="space-y-4">
          {items.map((item) =>
            item.type === 'order'
              ? renderOrderCard(item.data)
              : renderPreorderCard(item.data),
          )}
        </div>
      )}
    </div>
  );
}
