'use client';

import { useState, useTransition, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderRow, OrderStatus, OrderStatusHistoryRow } from '@/lib/supabase/types';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/order/format';
import { formatShippingAddressOneLine } from '@/lib/order';
import { formatPriceDual, eurToBgnSync } from '@/lib/catalog';
import OrderPromoAction from './OrderPromoAction';

// ============================================================================
// Types
// ============================================================================

/** Label maps fetched from the `options` table — single source of truth */
export interface OptionLabelMaps {
  sports: Record<string, string>;
  colors: Record<string, string>;
  flavors: Record<string, string>;
  dietary: Record<string, string>;
  sizes: Record<string, string>;
}

interface OrdersTableProps {
  orders: OrderRow[];
  boxTypeNames: Record<string, string>;
  optionLabels: OptionLabelMaps;
  eurToBgnRate: number;
  total: number;
  currentPage: number;
  perPage: number;
}

// ============================================================================
// Status Transition Map
// ============================================================================

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Background color classes for status badges */
const STATUS_BG_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

// ============================================================================
// Personalization field labels (Bulgarian)
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
  sports: 'Спортове',
  sport_other: 'Друг спорт',
  colors: 'Цветове',
  flavors: 'Вкусове',
  flavor_other: 'Друг вкус',
  size_upper: 'Размер горна част',
  size_lower: 'Размер долна част',
  dietary: 'Хранителни ограничения',
  dietary_other: 'Друго ограничение',
  additional_notes: 'Допълнителни бележки',
};

// ============================================================================
// Date formatting
// ============================================================================

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}



// ============================================================================
// Component
// ============================================================================

/** Compute the shared transitions available for a set of selected orders */
function getSharedTransitions(orders: OrderRow[], selectedIds: Set<string>): OrderStatus[] {
  const selected = orders.filter(o => selectedIds.has(o.id));
  if (selected.length === 0) return [];
  // Start from the first order's transitions and intersect with the rest
  let shared = new Set(ALLOWED_TRANSITIONS[selected[0].status] ?? []);
  for (let i = 1; i < selected.length; i++) {
    const allowed = new Set(ALLOWED_TRANSITIONS[selected[i].status] ?? []);
    shared = new Set([...shared].filter(s => allowed.has(s)));
  }
  return [...shared];
}

export function OrdersTable({
  orders,
  boxTypeNames,
  optionLabels,
  eurToBgnRate,
}: OrdersTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    orderId: string;
    orderNumber: string;
    from: OrderStatus;
    to: OrderStatus;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [statusHistory, setStatusHistory] = useState<Record<string, OrderStatusHistoryRow[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------- Bulk selection ----------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const allIds = useMemo(() => orders.map(o => o.id), [orders]);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === allIds.length) return new Set();
      return new Set(allIds);
    });
  }, [allIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkStatus('');
    setBulkNotes('');
    setBulkResult(null);
  }, []);

  const sharedTransitions = useMemo(
    () => getSharedTransitions(orders, selectedIds),
    [orders, selectedIds],
  );

  async function executeBulkUpdate() {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult(null);

    try {
      const res = await fetch('/api/admin/order/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: [...selectedIds],
          status: bulkStatus,
          notes: bulkNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Грешка при масово обновяване.');
      }

      const data = await res.json();
      setBulkResult({ succeeded: data.succeeded, failed: data.failed });

      // Clear cached history for updated orders
      setStatusHistory(prev => {
        const copy = { ...prev };
        for (const id of selectedIds) delete copy[id];
        return copy;
      });

      // If all succeeded, auto-clear selection after a short delay
      if (data.failed === 0) {
        setTimeout(() => {
          clearSelection();
          setBulkConfirmOpen(false);
        }, 1200);
      }

      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неочаквана грешка.');
    } finally {
      setBulkLoading(false);
    }
  }

  // ---------- Status update ----------
  function openStatusDropdown(orderId: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusDropdownId(prev => {
      if (prev === orderId) {
        setDropdownRect(null);
        return null;
      }
      setDropdownRect({ top: rect.bottom + 4, left: rect.left });
      return orderId;
    });
  }

  function selectNewStatus(order: OrderRow, newStatus: OrderStatus) {
    setStatusDropdownId(null);
    setConfirmModal({
      orderId: order.id,
      orderNumber: order.order_number,
      from: order.status,
      to: newStatus,
    });
    setNotes('');
  }

  async function confirmStatusUpdate() {
    if (!confirmModal) return;
    setError(null);

    try {
      const res = await fetch(`/api/admin/order/${confirmModal.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: confirmModal.to,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Грешка при обновяване на статуса.');
      }

      setConfirmModal(null);
      setNotes('');
      // Remove cached history for this order so it refreshes
      setStatusHistory(prev => {
        const copy = { ...prev };
        delete copy[confirmModal.orderId];
        return copy;
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неочаквана грешка.');
    }
  }

  // ---------- Expand row / load history ----------
  async function toggleExpand(orderId: string) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);

    if (!statusHistory[orderId]) {
      setLoadingHistory(orderId);
      try {
        const res = await fetch(`/api/admin/order/${orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatusHistory(prev => ({ ...prev, [orderId]: data.history }));
        }
      } catch {
        // Silently fail — history is non-critical
      } finally {
        setLoadingHistory(null);
      }
    }
  }

  return (
    <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-[var(--color-brand-navy)] focus:ring-[var(--color-brand-navy)] cursor-pointer"
                  title={allSelected ? 'Премахни всички' : 'Избери всички'}
                />
              </th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Номер</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Клиент</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Кутия</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Цена</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Дата</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const transitions = ALLOWED_TRANSITIONS[order.status] ?? [];
              const isExpanded = expandedId === order.id;

              return (
                <Fragment key={order.id}>
                  <tr className={`border-b hover:bg-gray-50 ${selectedIds.has(order.id) ? 'bg-blue-50/50' : ''}`}>
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--color-brand-navy)] focus:ring-[var(--color-brand-navy)] cursor-pointer"
                      />
                    </td>

                    {/* Order number */}
                    <td className="py-3 px-4 text-sm font-mono">
                      {order.order_number}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium">{order.customer_full_name}</div>
                      <div className="text-xs text-gray-500">{order.customer_email}</div>
                    </td>

                    {/* Box type */}
                    <td className="py-3 px-4 text-sm">
                      {boxTypeNames[order.box_type] ?? order.box_type}
                    </td>

                    {/* Status badge + dropdown */}
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => transitions.length > 0 ? openStatusDropdown(order.id, e) : undefined}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BG_COLORS[order.status]} ${
                          transitions.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                        }`}
                        title={transitions.length > 0 ? 'Промени статус' : undefined}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                        {transitions.length > 0 && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-sm">
                      {order.final_price_eur != null
                        ? formatPriceDual(order.final_price_eur, eurToBgnSync(order.final_price_eur, eurToBgnRate))
                        : '—'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="text-sm text-[var(--color-brand-navy)] hover:underline"
                        title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                      >
                        {isExpanded ? '▲ Скрий' : '▼ Детайли'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="bg-gray-50 px-4 py-4">
                        <OrderRowDetail
                          order={order}
                          boxTypeName={boxTypeNames[order.box_type] ?? order.box_type}
                          optionLabels={optionLabels}
                          eurToBgnRate={eurToBgnRate}
                          history={statusHistory[order.id]}
                          loadingHistory={loadingHistory === order.id}
                          onRefresh={() => router.refresh()}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-30 mt-4 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] rounded-t-xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-[var(--color-brand-navy)]">
              {selectedIds.size} {selectedIds.size === 1 ? 'поръчка' : 'поръчки'}
            </span>

            {sharedTransitions.length > 0 ? (
              <>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as OrderStatus | '')}
                  className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                >
                  <option value="">Промени статус на...</option>
                  {sharedTransitions.map(s => (
                    <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (!bulkStatus) return;
                    setBulkResult(null);
                    setBulkConfirmOpen(true);
                  }}
                  disabled={!bulkStatus}
                  className="px-4 py-1.5 text-sm bg-[var(--color-brand-orange)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Приложи
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">
                Избраните поръчки нямат общ допустим преход
              </span>
            )}

            <button
              onClick={clearSelection}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Изчисти избора
            </button>
          </div>
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirmOpen && bulkStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-3 text-[var(--color-brand-navy)]">
              Масова промяна на статус
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Ще промените статуса на <strong>{selectedIds.size}</strong>{' '}
              {selectedIds.size === 1 ? 'поръчка' : 'поръчки'} на{' '}
              <span className={`font-semibold ${ORDER_STATUS_COLORS[bulkStatus as OrderStatus]}`}>
                {ORDER_STATUS_LABELS[bulkStatus as OrderStatus]}
              </span>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бележка (незадължително)
              </label>
              <textarea
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Причина за промяната..."
              />
            </div>

            {bulkResult && (
              <div className={`text-sm mb-3 ${
                bulkResult.failed === 0 ? 'text-green-600' : 'text-amber-600'
              }`}>
                Успешно: {bulkResult.succeeded}, Неуспешно: {bulkResult.failed}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setBulkConfirmOpen(false); setError(null); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                disabled={bulkLoading}
              >
                Отказ
              </button>
              <button
                onClick={executeBulkUpdate}
                disabled={bulkLoading}
                className="px-4 py-2 text-sm bg-[var(--color-brand-orange)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {bulkLoading ? 'Обработка...' : 'Потвърди'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status dropdown (rendered outside the table to avoid overflow clipping) */}
      {statusDropdownId && dropdownRect && (() => {
        const order = orders.find(o => o.id === statusDropdownId);
        if (!order) return null;
        const transitions = ALLOWED_TRANSITIONS[order.status] ?? [];
        if (transitions.length === 0) return null;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setStatusDropdownId(null); setDropdownRect(null); }} />
            <div
              className="fixed z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ top: dropdownRect.top, left: dropdownRect.left }}
            >
              {transitions.map(s => (
                <button
                  key={s}
                  onClick={() => selectNewStatus(order, s)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${STATUS_BG_COLORS[s].split(' ')[0]}`} />
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-3 text-[var(--color-brand-navy)]">
              Промяна на статус
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Сигурни ли сте, че искате да промените статуса на{' '}
              <strong>{confirmModal.orderNumber}</strong> от{' '}
              <span className={ORDER_STATUS_COLORS[confirmModal.from]}>
                {ORDER_STATUS_LABELS[confirmModal.from]}
              </span>{' '}
              на{' '}
              <span className={ORDER_STATUS_COLORS[confirmModal.to]}>
                {ORDER_STATUS_LABELS[confirmModal.to]}
              </span>
              ?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бележка (незадължително)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Причина за промяната..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmModal(null); setError(null); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                disabled={isPending}
              >
                Отказ
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-[var(--color-brand-orange)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? 'Запазване...' : 'Потвърди'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Expanded Row Detail
// ============================================================================

function OrderRowDetail({
  order,
  boxTypeName,
  optionLabels,
  eurToBgnRate,
  history,
  loadingHistory,
  onRefresh,
}: {
  order: OrderRow;
  boxTypeName: string;
  optionLabels: OptionLabelMaps;
  eurToBgnRate: number;
  history?: OrderStatusHistoryRow[];
  loadingHistory: boolean;
  onRefresh: () => void;
}) {
  /** Resolve an array of raw IDs to their DB labels */
  function mapLabels(ids: string[] | null | undefined, labelMap: Record<string, string>): string | null {
    if (!ids || ids.length === 0) return null;
    return ids.map(id => labelMap[id] ?? id).join(', ');
  }

  // Personalization fields — values are mapped through DB label maps
  const personalizationEntries: [string, string | null | undefined][] = [
    ['sports', mapLabels(order.sports, optionLabels.sports)],
    ['sport_other', order.sport_other ?? null],
    ['colors', mapLabels(order.colors, optionLabels.colors)],
    ['flavors', mapLabels(order.flavors, optionLabels.flavors)],
    ['flavor_other', order.flavor_other ?? null],
    ['size_upper', order.size_upper ? (optionLabels.sizes[order.size_upper] ?? order.size_upper) : null],
    ['size_lower', order.size_lower ? (optionLabels.sizes[order.size_lower] ?? order.size_lower) : null],
    ['dietary', mapLabels(order.dietary, optionLabels.dietary)],
    ['dietary_other', order.dietary_other ?? null],
    ['additional_notes', order.additional_notes ?? null],
  ];

  const hasPersonalization = personalizationEntries.some(
    ([, v]) => v != null && v !== '',
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
      {/* Column 1: Personalization */}
      <div>
        <h4 className="font-semibold text-[var(--color-brand-navy)] mb-2">Персонализация</h4>
        {!order.wants_personalization ? (
          <p className="text-gray-500 italic">Без персонализация</p>
        ) : !hasPersonalization ? (
          <p className="text-gray-500 italic">Не са посочени предпочитания</p>
        ) : (
          <dl className="space-y-1">
            {personalizationEntries.map(([key, value]) => {
              if (value == null || value === '') return null;
              return (
                <div key={key}>
                  <dt className="text-gray-500 text-xs">{FIELD_LABELS[key] ?? key}</dt>
                  <dd className="text-gray-800">{value}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>

      {/* Column 2: Shipping + Promo */}
      <div>
        <h4 className="font-semibold text-[var(--color-brand-navy)] mb-2">Доставка</h4>
        {order.delivery_method === 'speedy_office' && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 mr-2 mb-1">
            Офис Speedy
          </span>
        )}
        <p className="text-gray-800 mb-1">{formatShippingAddressOneLine(order.shipping_address)}</p>
        {order.shipping_address.phone && (
          <p className="text-gray-500 text-xs">Тел: {order.shipping_address.phone}</p>
        )}
        {order.shipping_address.delivery_notes && (
          <p className="text-gray-500 text-xs mt-1">Бележка: {order.shipping_address.delivery_notes}</p>
        )}

        <h4 className="font-semibold text-[var(--color-brand-navy)] mt-4 mb-2">Поръчка</h4>
        <dl className="space-y-1">
          <div>
            <dt className="text-gray-500 text-xs">Кутия</dt>
            <dd>{boxTypeName}</dd>
          </div>
          {order.promo_code && (
            <div>
              <dt className="text-gray-500 text-xs">Промо код</dt>
              <dd>
                {order.promo_code}{' '}
                {order.discount_percent != null && (
                  <span className="text-green-600 text-xs">(-{order.discount_percent}%)</span>
                )}
              </dd>
            </div>
          )}
          {order.original_price_eur != null && order.final_price_eur != null && order.original_price_eur !== order.final_price_eur && (
            <div>
              <dt className="text-gray-500 text-xs">Оригинална цена</dt>
              <dd className="line-through text-gray-400">{formatPriceDual(order.original_price_eur, eurToBgnSync(order.original_price_eur, eurToBgnRate))}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 text-xs">Крайна цена</dt>
            <dd className="font-semibold">{order.final_price_eur != null ? formatPriceDual(order.final_price_eur, eurToBgnSync(order.final_price_eur, eurToBgnRate)) : '—'}</dd>
          </div>
        </dl>

        {order.converted_from_preorder_id && (
          <p className="mt-3 text-xs text-indigo-600">
            Преобразувана от предварителна поръчка
          </p>
        )}

        {/* Admin promo management */}
        <OrderPromoAction
          orderId={order.id}
          currentPromo={order.promo_code}
          currentDiscount={order.discount_percent}
          orderStatus={order.status}
          onSuccess={onRefresh}
        />
      </div>

      {/* Column 3: Status History */}
      <div>
        <h4 className="font-semibold text-[var(--color-brand-navy)] mb-2">История на статуса</h4>
        {loadingHistory ? (
          <p className="text-gray-500 text-xs">Зареждане...</p>
        ) : history && history.length > 0 ? (
          <ol className="space-y-2 border-l-2 border-gray-200 pl-4">
            {history.map(entry => (
              <li key={entry.id} className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-brand-navy)]" />
                <p className="text-xs text-gray-500">{formatDateTime(entry.created_at)}</p>
                <p className="text-sm">
                  {entry.from_status ? (
                    <>
                      <span className={ORDER_STATUS_COLORS[entry.from_status]}>
                        {ORDER_STATUS_LABELS[entry.from_status]}
                      </span>
                      {' → '}
                    </>
                  ) : null}
                  <span className={ORDER_STATUS_COLORS[entry.to_status]}>
                    {ORDER_STATUS_LABELS[entry.to_status]}
                  </span>
                </p>
                {entry.notes && (
                  <p className="text-xs text-gray-500 italic mt-0.5">{entry.notes}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-500 text-xs">Няма история</p>
        )}
      </div>
    </div>
  );
}

// Need Fragment import
import { Fragment } from 'react';
