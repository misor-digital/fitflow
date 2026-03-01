'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  ORDER_TYPE_COLORS,
  PREORDER_STATUS_LABELS,
  PREORDER_STATUS_COLORS,
  formatOrderNumber,
  formatShippingAddress,
  formatDeliveryMethodLabel,
} from '@/lib/order';
import { formatPriceDual } from '@/lib/catalog';
import type {
  OrderRow,
  Preorder,
  OrderStatus,
  OrderStatusHistoryRow,
} from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderFilter = 'all' | 'preorder' | 'subscription' | 'onetime';
type DateRange = 'all' | '30d' | '3m' | '6m' | '1y';
type SortDirection = 'desc' | 'asc';

type UnifiedItem =
  | { type: 'order'; data: OrderRow }
  | { type: 'preorder'; data: Preorder };

// ---------------------------------------------------------------------------
// Date range config
// ---------------------------------------------------------------------------

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'Всички' },
  { key: '30d', label: 'Последните 30 дни' },
  { key: '3m', label: '3 месеца' },
  { key: '6m', label: '6 месеца' },
  { key: '1y', label: '1 година' },
];

function dateRangeCutoff(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  switch (range) {
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3m':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6m':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

// ---------------------------------------------------------------------------
// All order statuses (for the status filter dropdown)
// ---------------------------------------------------------------------------

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

// Dot color per order status (used in status filter checkboxes)
const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  processing: 'bg-indigo-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-400',
};

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { key: OrderFilter; label: string }[] = [
  { key: 'all', label: 'Всички' },
  { key: 'preorder', label: 'Предварителни' },
  { key: 'subscription', label: 'Абонаментни' },
  { key: 'onetime', label: 'Еднократни' },
];

const VALID_FILTERS = new Set<string>(['preorder', 'subscription', 'onetime']);

function isValidFilter(value: string | null): value is OrderFilter {
  return value !== null && VALID_FILTERS.has(value);
}



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

const PAGE_SIZE = 15;

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
  /** Status history per order ID — enables inline progress indicator */
  statusHistories?: Record<string, OrderStatusHistoryRow[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrdersList({
  orders,
  preorders,
  boxTypeNames,
  eurToBgnRate,
  statusHistories,
}: OrdersListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialType = searchParams.get('type');
  const [activeFilter, setActiveFilter] = useState<OrderFilter>(
    isValidFilter(initialType) ? initialType : 'all',
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<OrderStatus>>(
    new Set(),
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Update activeFilter + URL query param
  const handleFilterChange = useCallback(
    (filter: OrderFilter) => {
      setActiveFilter(filter);
      const params = new URLSearchParams(searchParams.toString());
      if (filter === 'all') {
        params.delete('type');
      } else {
        params.set('type', filter);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ''}`, {
        scroll: false,
      });
    },
    [searchParams, router, pathname],
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setVisibleCount(PAGE_SIZE);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Click-outside for status dropdown
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!statusDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusDropdownOpen]);

  const toggleStatus = useCallback((s: OrderStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    setDateRange('all');
    setSelectedStatuses(new Set());
    setSortDirection('desc');
    setVisibleCount(PAGE_SIZE);
  }, []);

  const hasActiveFilters =
    searchQuery !== '' ||
    dateRange !== 'all' ||
    selectedStatuses.size > 0 ||
    sortDirection !== 'desc';

  // Counts per tab (unfiltered data — unchanged)
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

  // Filtered items — chain: type filter → date range → status → search → sort
  const items: UnifiedItem[] = useMemo(() => {
    // Step 1: type filter
    let result: UnifiedItem[];
    switch (activeFilter) {
      case 'preorder':
        result = preorders.map((p) => ({ type: 'preorder' as const, data: p }));
        break;
      case 'subscription':
        result = orders
          .filter((o) => o.order_type === 'subscription')
          .map((o) => ({ type: 'order' as const, data: o }));
        break;
      case 'onetime':
        result = orders
          .filter((o) => ONETIME_TYPES.has(o.order_type))
          .map((o) => ({ type: 'order' as const, data: o }));
        break;
      case 'all':
      default:
        result = [
          ...orders.map((o) => ({ type: 'order' as const, data: o })),
          ...preorders.map((p) => ({ type: 'preorder' as const, data: p })),
        ];
        break;
    }

    // Step 2: date range filter
    const cutoff = dateRangeCutoff(dateRange);
    if (cutoff) {
      const cutoffTime = cutoff.getTime();
      result = result.filter(
        (item) => new Date(item.data.created_at).getTime() >= cutoffTime,
      );
    }

    // Step 3: status filter (only applies to orders; preorders always pass)
    if (selectedStatuses.size > 0) {
      result = result.filter((item) => {
        if (item.type === 'preorder') return true;
        return selectedStatuses.has(item.data.status as OrderStatus);
      });
    }

    // Step 4: search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        if (item.type === 'order') {
          return (
            item.data.order_number?.toLowerCase().includes(q) ||
            formatOrderNumber(item.data.order_number).toLowerCase().includes(q)
          );
        }
        // Preorders — search against order_id
        return item.data.order_id?.toLowerCase().includes(q) ?? false;
      });
    }

    // Step 5: sort
    const dir = sortDirection === 'desc' ? -1 : 1;
    result.sort(
      (a, b) =>
        dir *
        (new Date(a.data.created_at).getTime() -
          new Date(b.data.created_at).getTime()),
    );

    return result;
  }, [
    orders,
    preorders,
    activeFilter,
    dateRange,
    selectedStatuses,
    searchQuery,
    sortDirection,
  ]);

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

        {/* Track link (always visible) + inline status summary */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <Link
            href={`/account/orders/${encodeURIComponent(order.order_number)}`}
            className="text-[var(--color-brand-orange)] font-medium hover:underline"
          >
            Детайли &rarr;
          </Link>

          {/* Mini progress indicator */}
          {statusHistories?.[order.id] && (() => {
            const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
            const isCancelled = statusKey === 'cancelled' || statusKey === 'refunded';
            const currentIndex = STATUS_STEPS.indexOf(statusKey);
            const history = statusHistories[order.id];
            const lastEntry = history[history.length - 1];

            return (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {/* Step dots */}
                {!isCancelled && (
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step, i) => {
                      const historyEntry = history.find(
                        (h) => h.to_status === step,
                      );
                      const tooltipText = historyEntry
                        ? `${ORDER_STATUS_LABELS[step]} — ${new Date(historyEntry.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        : ORDER_STATUS_LABELS[step];

                      return (
                        <div
                          key={step}
                          title={tooltipText}
                          className={`w-2 h-2 rounded-full cursor-default ${
                            i <= currentIndex
                              ? 'bg-[var(--color-brand-orange)]'
                              : 'bg-gray-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
                {/* Last update date */}
                {lastEntry && (
                  <span>
                    {new Date(lastEntry.created_at).toLocaleDateString('bg-BG', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            );
          })()}
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

        {/* Conversion CTA / expiry / linked order */}
        {(() => {
          const now = new Date();
          const expiresAt = preorder.conversion_token_expires_at
            ? new Date(preorder.conversion_token_expires_at)
            : null;
          const isExpired = expiresAt ? expiresAt < now : false;
          const daysRemaining = expiresAt
            ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          if (preorder.conversion_status === 'pending' && !isExpired) {
            return (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/order/convert?token=${preorder.conversion_token}`}
                  className="bg-[var(--color-brand-orange)] text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 inline-block"
                >
                  Конвертирай &rarr;
                </Link>
                {daysRemaining !== null && daysRemaining <= 14 && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                    Изтича след {daysRemaining} дни
                  </span>
                )}
              </div>
            );
          }

          if (preorder.conversion_status === 'pending' && isExpired) {
            return (
              <div className="mt-3">
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                  Изтекла
                </span>
              </div>
            );
          }

          if (preorder.converted_to_order_id) {
            const linkedOrder = orders.find((o) => o.id === preorder.converted_to_order_id);
            if (!linkedOrder) return null;
            return (
              <div className="mt-3 text-sm">
                <Link
                  href={`/account/orders/${encodeURIComponent(linkedOrder.order_number)}`}
                  className="text-[var(--color-brand-orange)] font-medium hover:underline"
                >
                  Виж поръчка &rarr;
                </Link>
              </div>
            );
          }

          return null;
        })()}

        {/* Detail link */}
        <div className="mt-3 text-sm">
          <Link
            href={`/account/orders/preorder/${preorder.id}`}
            className="text-[var(--color-brand-orange)] font-medium hover:underline text-sm"
          >
            Детайли &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <div>
      {/* Filter / search bar */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.65 6.15z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Търси по номер на поръчка..."
            className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent outline-none"
          />
        </div>

        {/* Date range pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {DATE_RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setDateRange(key); setVisibleCount(PAGE_SIZE); }}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                dateRange === key
                  ? 'bg-[var(--color-brand-orange)] text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter dropdown */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((prev) => !prev)}
            className="text-sm border rounded-lg px-3 py-2 hover:border-gray-300 transition-colors flex items-center gap-1"
          >
            Статус
            {selectedStatuses.size > 0 && (
              <span className="text-xs bg-[var(--color-brand-orange)] text-white rounded-full px-1.5 py-0.5 leading-none ml-1">
                {selectedStatuses.size}
              </span>
            )}
            <svg
              className="h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
          {statusDropdownOpen && (
            <div className="absolute z-10 bg-white border rounded-lg shadow-lg p-3 mt-1 min-w-[200px]">
              {ALL_ORDER_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 py-1 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(s)}
                    onChange={() => toggleStatus(s)}
                    className="accent-[var(--color-brand-orange)]"
                  />
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT_COLOR[s]}`}
                  />
                  {ORDER_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sort toggle */}
        <button
          type="button"
          onClick={() => {
            setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
            setVisibleCount(PAGE_SIZE);
          }}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          {sortDirection === 'desc' ? 'Най-нови' : 'Най-стари'}
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            {sortDirection === 'desc' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-4 mb-6 border-b pb-3 overflow-x-auto">
        {TABS.filter(({ key }) => key !== 'preorder' || preorders.length > 0).map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { handleFilterChange(key); setVisibleCount(PAGE_SIZE); }}
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

      {/* List, filtered-empty state, or true empty state */}
      {items.length === 0 && hasActiveFilters ? (
        <div className="text-center py-12 text-gray-500">
          <p>Няма поръчки, отговарящи на филтрите.</p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-3 inline-block text-[var(--color-brand-orange)] font-medium hover:underline"
          >
            Изчисти филтри
          </button>
        </div>
      ) : items.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {/* Results summary */}
          <p className="text-xs text-gray-400 mb-3">
            Показани {Math.min(visibleCount, items.length)} от {items.length} поръчки
          </p>

          <div className="space-y-4">
            {items.slice(0, visibleCount).map((item) =>
              item.type === 'order'
                ? renderOrderCard(item.data)
                : renderPreorderCard(item.data),
            )}
          </div>

          {/* Load more button */}
          {visibleCount < items.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="w-full py-3 mt-4 text-sm font-medium text-[var(--color-brand-orange)] bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              Покажи още ({items.length - visibleCount} оставащи)
            </button>
          )}
        </>
      )}
    </div>
  );
}
