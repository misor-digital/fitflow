'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CancelWaybillModal, { type CancelWaybillTarget } from './CancelWaybillModal';
import {
  formatPickupPeriod,
  formatYmdBg,
  getCheaperMode,
  isFinalSpeedyStatus,
  isWaybillCancellable,
  SENDER_MODE_LABELS,
  SENDER_MODES,
  type OrderCostEstimates,
  type SenderMode,
} from '@/lib/constants/speedy';

export interface DispatchOrder {
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
  speedy_sender_mode: 'pickup' | 'dropoff' | null;
  speedy_pickup_request_id: string | null;
  speedy_pickup_requested_at: string | null;
  speedy_pickup_requests: {
    pickup_date: string;
    pickup_period_from: string | null;
    pickup_period_to: string | null;
    status: 'pending' | 'requested' | 'failed';
  } | null;
}

interface DispatchTableProps {
  orders: DispatchOrder[];
  onRefresh: () => void;
  /** Dry-run price estimates per order (orders without a waybill) */
  estimates: Record<string, OrderCostEstimates>;
  /** Configured sender mode, used when no per-order mode is selected */
  defaultSenderMode: SenderMode;
  /** Per-order sender mode chosen for waybill creation */
  selectedModes: Record<string, SenderMode>;
  onSelectMode: (orderId: string, mode: SenderMode) => void;
  /** Informational per-visit pickup fee, subtracted from the pickup total */
  visitFeeEur: number | null;
}

/** Sender mode an existing waybill was created with (legacy rows were drop-off). */
function waybillMode(order: DispatchOrder): SenderMode {
  return order.speedy_sender_mode ?? 'dropoff';
}

function formatSignedEur(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)} €`;
}

/** Margin sub-columns shrink to their content instead of sharing the table's spare width */
const MARGIN_CELL = 'w-px whitespace-nowrap px-1.5 py-2 text-right';

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

export default function DispatchTable({
  orders,
  onRefresh,
  estimates,
  defaultSenderMode,
  selectedModes,
  onSelectMode,
  visitFeeEur,
}: DispatchTableProps) {
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

  const handleCreateSingle = useCallback(async (orderId: string, senderMode: SenderMode) => {
    setCreatingId(orderId);
    setError(null);
    try {
      const res = await fetch('/api/admin/speedy/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, senderMode }),
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

  function getNotCancellableReason(order: DispatchOrder): string {
    if (!order.speedy_waybill_id) return 'Няма товарителница';
    if (order.speedy_pickup_request_id) {
      return 'Включена в заявка за куриер — анулирането през системата не е възможно';
    }
    return 'Статусът на пратката не позволява анулиране';
  }

  function getPickupTitle(order: DispatchOrder): string {
    const pickup = order.speedy_pickup_requests;
    if (!pickup) return 'Куриер заявен';
    const period = formatPickupPeriod(pickup.pickup_period_from, pickup.pickup_period_to);
    return `Куриер заявен за ${formatYmdBg(pickup.pickup_date)}${period ? `, ${period}` : ''}`;
  }

  // ---------- Price comparison ----------

  const pricesCalculated = Object.keys(estimates).length > 0;
  const highlight = pricesCalculated ? 'bg-amber-50' : '';

  function modeFor(order: DispatchOrder): SenderMode {
    return selectedModes[order.id] ?? defaultSenderMode;
  }

  const pendingOrders = orders.filter((o) => !o.speedy_waybill_id);
  const estimatedPending = pendingOrders.filter((o) => estimates[o.id]);

  function sumMargins(pick: (order: DispatchOrder) => SenderMode) {
    let sum = 0;
    let missing = 0;
    for (const o of estimatedPending) {
      const est = estimates[o.id][pick(o)];
      if (est.ok) sum += est.marginEur;
      else missing++;
    }
    return { sum: Math.round(sum * 100) / 100, missing };
  }

  const fee = visitFeeEur ?? 0;
  const pickupTotal = sumMargins(() => 'pickup');
  const dropoffTotal = sumMargins(() => 'dropoff');
  const pickupNet = Math.round((pickupTotal.sum - fee) * 100) / 100;
  const selectedTotal = sumMargins(modeFor);
  const anySelectedPickup = estimatedPending.some((o) => modeFor(o) === 'pickup');
  const selectedNet = Math.round((selectedTotal.sum - (anySelectedPickup ? fee : 0)) * 100) / 100;
  const betterTotal: SenderMode | null =
    pickupNet === dropoffTotal.sum ? null : pickupNet > dropoffTotal.sum ? 'pickup' : 'dropoff';

  // Mixing modes means both a courier visit and an office trip
  const modesInUse = new Set<SenderMode>([
    ...pendingOrders.map(modeFor),
    ...orders
      .filter((o) => o.speedy_waybill_id && !isFinalSpeedyStatus(o.speedy_status))
      .map(waybillMode),
  ]);
  const mixedModes = modesInUse.size > 1;

  function renderMarginCell(order: DispatchOrder, mode: SenderMode) {
    const base = `${MARGIN_CELL} ${highlight}`;

    if (order.speedy_waybill_id) {
      if (waybillMode(order) !== mode) return <td key={mode} className={base} />;
      const margin = getMargin(order);
      return (
        <td key={mode} className={base}>
          {margin != null ? (
            <span className={Number(margin) >= 0 ? 'text-green-600' : 'text-red-600'}>
              {margin} €
            </span>
          ) : '—'}
        </td>
      );
    }

    const orderEstimates = estimates[order.id];
    const est = orderEstimates?.[mode];
    if (!est) return <td key={mode} className={`${base} text-gray-400`}>—</td>;
    if (!est.ok) {
      return (
        <td key={mode} className={base}>
          <span className="text-amber-600 cursor-help" title={est.error}>⚠</span>
        </td>
      );
    }

    const isBetter = getCheaperMode(orderEstimates, defaultSenderMode) === mode;
    return (
      <td key={mode} className={base} title={`Оценка: цена ${est.costEur.toFixed(2)} €`}>
        <span
          className={`italic ${est.marginEur >= 0 ? 'text-green-600' : 'text-red-600'} ${
            isBetter ? 'font-bold' : 'opacity-50'
          }`}
        >
          ≈ {formatSignedEur(est.marginEur)}
        </span>
      </td>
    );
  }

  function renderTotalCell(mode: SenderMode) {
    const total = mode === 'pickup' ? pickupNet : dropoffTotal.sum;
    const missing = mode === 'pickup' ? pickupTotal.missing : dropoffTotal.missing;
    return (
      <td key={mode} className={`${MARGIN_CELL} ${highlight}`}>
        <span
          className={`italic ${total >= 0 ? 'text-green-600' : 'text-red-600'} ${
            betterTotal === mode ? 'font-bold' : betterTotal ? 'opacity-50' : ''
          }`}
        >
          ≈ {formatSignedEur(total)}
        </span>
        {missing > 0 && (
          <span className="block text-[10px] font-normal text-amber-600">{missing} без оценка</span>
        )}
      </td>
    );
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

      {mixedModes && pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm mb-3">
          ⚠ Смесени режими — ще е нужен и куриер (Pick up), и посещение в офис (Drop off).
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th rowSpan={2} className="p-2 border-b w-8">
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
              <th rowSpan={2} className="p-2 border-b font-semibold">Поръчка</th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Клиент</th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Метод</th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Дестинация</th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Статус</th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Товарителница</th>
              <th rowSpan={2} className="p-2 border-b font-semibold text-right">Такса</th>
              <th rowSpan={2} className="p-2 border-b font-semibold text-right">Реална цена</th>
              <th
                colSpan={2}
                className={`p-2 border-b font-semibold text-center ${pricesCalculated ? 'bg-amber-100' : ''}`}
              >
                Марж
              </th>
              <th rowSpan={2} className="p-2 border-b font-semibold">Действие</th>
            </tr>
            <tr className="bg-gray-100">
              {SENDER_MODES.map((mode) => (
                <th
                  key={mode}
                  className={`w-px whitespace-nowrap px-1.5 pb-2 text-right border-b text-xs font-semibold ${
                    pricesCalculated ? 'bg-amber-100' : ''
                  }`}
                >
                  {SENDER_MODE_LABELS[mode]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const hasWaybill = !!order.speedy_waybill_id;
              const cancellable = isWaybillCancellable(order);
              return (
                <tr key={order.id} className="hover:bg-gray-50 border-b">
                  <td className="p-2" title={cancellable ? undefined : getNotCancellableReason(order)}>
                    <input
                      type="checkbox"
                      aria-label={`Избери ${order.order_number}`}
                      title={cancellable ? undefined : getNotCancellableReason(order)}
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
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {order.speedy_pickup_request_id ? (
                          <span
                            className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-semibold"
                            title={getPickupTitle(order)}
                          >
                            🚚 Куриер заявен
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                            ✓ Създадена
                          </span>
                        )}
                        {order.speedy_sender_mode === 'dropoff' && (
                          <span
                            className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            title="Създадена за предаване в офис на Speedy"
                          >
                            Офис
                          </span>
                        )}
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
                  {SENDER_MODES.map((mode) => renderMarginCell(order, mode))}
                  <td className="p-2">
                    {!hasWaybill && (
                      <span className="inline-flex items-center gap-2">
                        <span
                          role="radiogroup"
                          aria-label={`Начин на предаване за ${order.order_number}`}
                          className="inline-flex rounded border overflow-hidden text-[10px] font-semibold whitespace-nowrap"
                        >
                          {SENDER_MODES.map((mode) => {
                            const selected = modeFor(order) === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onSelectMode(order.id, mode)}
                                className={`px-1.5 py-0.5 ${
                                  selected
                                    ? 'bg-[var(--color-brand-navy)] text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {SENDER_MODE_LABELS[mode]}
                              </button>
                            );
                          })}
                        </span>
                        <button
                          onClick={() => handleCreateSingle(order.id, modeFor(order))}
                          disabled={creatingId === order.id}
                          className="text-xs bg-[var(--color-brand-orange)] text-white px-2 py-1 rounded font-semibold disabled:opacity-50"
                        >
                          {creatingId === order.id ? '...' : 'Създай'}
                        </button>
                      </span>
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
          {estimatedPending.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 font-semibold">
                <td colSpan={9} className="p-2 text-right text-xs">
                  Общо за {estimatedPending.length} чакащи (оценка)
                  {fee > 0 && (
                    <span className="block font-normal text-gray-500">
                      Pick up включва такса посещение −{fee.toFixed(2)} €
                    </span>
                  )}
                </td>
                {SENDER_MODES.map(renderTotalCell)}
                <td className="p-2 text-xs whitespace-nowrap">
                  Избрано:{' '}
                  <span className={`italic ${selectedNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ≈ {formatSignedEur(selectedNet)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
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
