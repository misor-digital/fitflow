'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CancelWaybillModal, { type CancelWaybillTarget } from './CancelWaybillModal';
import { isWaybillCancellable } from '@/lib/constants/speedy';

interface DispatchOrder {
  id: string;
  order_number: string;
  user_id: string;
  customer_first_name: string;
  customer_last_name: string;
  delivery_method: 'address' | 'speedy_office' | 'speedy_automat';
  shipping_address: {
    city?: string;
    speedy_office_name?: string;
    speedy_office_id?: string;
  };
  speedy_waybill_id: string | null;
  speedy_parcel_ids: string[] | null;
  speedy_status: string | null;
  delivery_fee_eur: number;
  delivery_fee_actual_eur: number | null;
}

interface DispatchTableProps {
  orders: DispatchOrder[];
  onRefresh: () => void;
}

const METHOD_ICONS: Record<string, string> = {
  speedy_office: '📦',
  speedy_automat: '🔒',
  address: '🏠',
};

const METHOD_LABELS: Record<string, string> = {
  speedy_office: 'Офис',
  speedy_automat: 'Автомат',
  address: 'Адрес',
};

export default function DispatchTable({ orders, onRefresh }: DispatchTableProps) {
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [cancelTargets, setCancelTargets] = useState<CancelWaybillTarget[] | null>(null);
  const [prevOrders, setPrevOrders] = useState(orders);

  // Reset selection when the order list changes (cycle switch / refresh)
  if (orders !== prevOrders) {
    setPrevOrders(orders);
    setSelectedIds(new Set());
  }

  const cancellableOrders = orders.filter((o) => isWaybillCancellable(o));
  const selectedCancellable = cancellableOrders.filter((o) => selectedIds.has(o.id));
  const allSelected = cancellableOrders.length > 0 && selectedCancellable.length === cancellableOrders.length;
  const someSelected = selectedCancellable.length > 0 && !allSelected;

  function toCancelTarget(order: DispatchOrder): CancelWaybillTarget {
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      waybillId: order.speedy_waybill_id!,
    };
  }

  function toggleSelected(orderId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(cancellableOrders.map((o) => o.id)));
  }

  const handleCancelDone = useCallback(() => {
    setSelectedIds(new Set());
    onRefresh();
  }, [onRefresh]);

  const handleCreateSingle = useCallback(async (orderId: string) => {
    setCreatingId(orderId);
    setError(null);
    try {
      const res = await fetch('/api/admin/speedy/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(`${orderId}: ${data.error || 'Грешка'}`);
      } else {
        onRefresh();
      }
    } catch {
      setError(`Грешка при създаване на товарителница за ${orderId}`);
    } finally {
      setCreatingId(null);
    }
  }, [onRefresh]);

  function getDestination(order: DispatchOrder): string {
    if (order.delivery_method === 'speedy_office' || order.delivery_method === 'speedy_automat') {
      return order.shipping_address.speedy_office_name || '—';
    }
    return order.shipping_address.city || '—';
  }

  function getMargin(order: DispatchOrder): string | null {
    if (order.delivery_fee_actual_eur == null) return null;
    const margin = order.delivery_fee_eur - order.delivery_fee_actual_eur;
    return margin.toFixed(2);
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {selectedCancellable.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setCancelTargets(selectedCancellable.map(toCancelTarget))}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Анулирай избраните ({selectedCancellable.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Изчисти избора
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border-b w-8">
                <input
                  type="checkbox"
                  aria-label="Избери всички товарителници за анулиране"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={cancellableOrders.length === 0}
                />
              </th>
              <th className="p-2 border-b font-semibold">Поръчка</th>
              <th className="p-2 border-b font-semibold">Клиент</th>
              <th className="p-2 border-b font-semibold">Метод</th>
              <th className="p-2 border-b font-semibold">Дестинация</th>
              <th className="p-2 border-b font-semibold">Статус</th>
              <th className="p-2 border-b font-semibold">Товарителница</th>
              <th className="p-2 border-b font-semibold text-right">Такса</th>
              <th className="p-2 border-b font-semibold text-right">Реална цена</th>
              <th className="p-2 border-b font-semibold text-right">Марж</th>
              <th className="p-2 border-b font-semibold">Действие</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const hasWaybill = !!order.speedy_waybill_id;
              const margin = getMargin(order);
              const cancellable = isWaybillCancellable(order);
              return (
                <tr key={order.id} className="hover:bg-gray-50 border-b">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      aria-label={`Избери ${order.order_number}`}
                      checked={cancellable && selectedIds.has(order.id)}
                      onChange={() => toggleSelected(order.id)}
                      disabled={!cancellable}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs">
                    <Link
                      href={`/admin/orders?search=${encodeURIComponent(order.order_number)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="p-2">
                    {order.customer_first_name} {order.customer_last_name}
                  </td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1">
                      <span>{METHOD_ICONS[order.delivery_method]}</span>
                      <span className="text-xs">{METHOD_LABELS[order.delivery_method]}</span>
                    </span>
                  </td>
                  <td className="p-2 text-xs max-w-[150px] truncate" title={getDestination(order)}>
                    {getDestination(order)}
                  </td>
                  <td className="p-2">
                    {hasWaybill ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        ✓ Създадена
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        ⏳ Чака
                      </span>
                    )}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {order.speedy_waybill_id ? (
                      <span className="inline-flex items-center gap-2">
                        {order.speedy_waybill_id}
                        <a
                          href={`/api/admin/speedy/labels/${order.id}?format=A6`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Преглед A6 (получател)"
                        >
                          👁️
                        </a>
                        <a
                          href={`/api/admin/speedy/labels/${order.id}?format=A4&senderCopy=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title="Преглед A4 (подател + получател)"
                        >
                          👁️‍📝
                        </a>
                        <a
                          href={`/api/admin/speedy/labels/${order.id}?format=A6&download=true`}
                          className="text-gray-600 hover:text-gray-800"
                          title="Изтегли PDF"
                        >
                          🖨️
                        </a>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-2 text-right">{order.delivery_fee_eur.toFixed(2)} €</td>
                  <td className="p-2 text-right">
                    {order.delivery_fee_actual_eur != null
                      ? `${order.delivery_fee_actual_eur.toFixed(2)} €`
                      : '—'}
                  </td>
                  <td className="p-2 text-right">
                    {margin != null ? (
                      <span className={Number(margin) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {margin} €
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-2">
                    {!hasWaybill && (
                      <button
                        onClick={() => handleCreateSingle(order.id)}
                        disabled={creatingId === order.id}
                        className="text-xs bg-[var(--color-brand-orange)] text-white px-2 py-1 rounded font-semibold disabled:opacity-50"
                      >
                        {creatingId === order.id ? '...' : 'Създай'}
                      </button>
                    )}
                    {cancellable && (
                      <button
                        onClick={() => setCancelTargets([toCancelTarget(order)])}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded font-semibold disabled:opacity-50"
                      >
                        Анулирай
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <p className="text-center text-gray-500 py-8">Няма поръчки за този цикъл.</p>
      )}

      {cancelTargets && (
        <CancelWaybillModal
          waybills={cancelTargets}
          onClose={() => setCancelTargets(null)}
          onDone={handleCancelDone}
        />
      )}
    </div>
  );
}
