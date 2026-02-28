'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderRow, OrderStatus, OrderStatusHistoryRow } from '@/lib/supabase/types';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/order/format';
import { formatShippingAddressOneLine } from '@/lib/order';
import OrderPromoAction from './OrderPromoAction';

// ============================================================================
// Types
// ============================================================================

interface OrdersTableProps {
  orders: OrderRow[];
  boxTypeNames: Record<string, string>;
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
// Personalization labels (Bulgarian)
// ============================================================================

const DETAIL_LABELS: Record<string, string> = {
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

export function OrdersTable({
  orders,
  boxTypeNames,
}: OrdersTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
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

  // ---------- Status update ----------
  function openStatusDropdown(orderId: string) {
    setStatusDropdownId(prev => (prev === orderId ? null : orderId));
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
                  <tr className="border-b hover:bg-gray-50">
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
                    <td className="py-3 px-4 relative">
                      <button
                        onClick={() => transitions.length > 0 ? openStatusDropdown(order.id) : undefined}
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

                      {/* Status dropdown */}
                      {statusDropdownId === order.id && transitions.length > 0 && (
                        <div className="absolute z-20 top-full left-4 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]">
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
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 text-sm">
                      {order.final_price_eur != null
                        ? `${order.final_price_eur.toFixed(2)} EUR`
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
                      <td colSpan={7} className="bg-gray-50 px-4 py-4">
                        <OrderRowDetail
                          order={order}
                          boxTypeName={boxTypeNames[order.box_type] ?? order.box_type}
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

      {/* Click-away handler for dropdown */}
      {statusDropdownId && (
        <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownId(null)} />
      )}

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
  history,
  loadingHistory,
  onRefresh,
}: {
  order: OrderRow;
  boxTypeName: string;
  history?: OrderStatusHistoryRow[];
  loadingHistory: boolean;
  onRefresh: () => void;
}) {
  // Personalization fields
  const personalizationEntries: [string, string | string[] | null | undefined][] = [
    ['sports', order.sports],
    ['sport_other', order.sport_other],
    ['colors', order.colors],
    ['flavors', order.flavors],
    ['flavor_other', order.flavor_other],
    ['size_upper', order.size_upper],
    ['size_lower', order.size_lower],
    ['dietary', order.dietary],
    ['dietary_other', order.dietary_other],
    ['additional_notes', order.additional_notes],
  ];

  const hasPersonalization = personalizationEntries.some(
    ([, v]) => v != null && (Array.isArray(v) ? v.length > 0 : v !== ''),
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
              if (value == null || (Array.isArray(value) && value.length === 0) || value === '') return null;
              return (
                <div key={key}>
                  <dt className="text-gray-500 text-xs">{DETAIL_LABELS[key] ?? key}</dt>
                  <dd className="text-gray-800">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </dd>
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
              <dd className="line-through text-gray-400">{order.original_price_eur.toFixed(2)} EUR</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 text-xs">Крайна цена</dt>
            <dd className="font-semibold">{order.final_price_eur?.toFixed(2) ?? '—'} EUR</dd>
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
