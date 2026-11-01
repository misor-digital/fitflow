'use client';

import { useState, useEffect, useCallback } from 'react';
import DispatchTable, { type DispatchOrder } from '@/components/admin/DispatchTable';
import DispatchActions from '@/components/admin/DispatchActions';
import RequestPickupModal from '@/components/admin/RequestPickupModal';
import {
  formatPickupPeriod,
  formatYmdBg,
  getPickupSkipReason,
  isFinalSpeedyStatus,
  isPickupEligible,
} from '@/lib/constants/speedy';

interface CycleOption {
  id: string;
  delivery_date: string;
  status: string;
  title: string | null;
}

interface DispatchDashboardProps {
  cycles: CycleOption[];
}

export default function DispatchDashboard({ cycles }: DispatchDashboardProps) {
  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? '');
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number } | null>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/speedy/dispatch?cycleId=${selectedCycleId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleBulkCreate() {
    if (!confirm('Създаване на товарителници за всички чакащи поръчки?')) return;
    setIsBulkCreating(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/admin/speedy/shipment/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: selectedCycleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkResult({ created: data.created, failed: data.failed });
        fetchOrders();
      }
    } finally {
      setIsBulkCreating(false);
    }
  }

  // Stats
  const total = orders.length;
  const withWaybill = orders.filter((o) => o.speedy_waybill_id).length;
  const pending = total - withWaybill;
  const totalMargin = orders.reduce((sum, o) => {
    if (o.delivery_fee_actual_eur != null) {
      return sum + (o.delivery_fee_eur - o.delivery_fee_actual_eur);
    }
    return sum;
  }, 0);

  // Courier pickup
  const pickupEligibleCount = orders.filter((o) => isPickupEligible(o)).length;
  const pickupSkippedCount = orders.filter((o) => {
    if (!o.speedy_waybill_id) return false;
    const reason = getPickupSkipReason(o);
    return reason === 'dropoff_waybill' || reason === 'already_requested';
  }).length;
  const requestedPickups = Array.from(
    new Map(
      orders
        .filter((o) => o.speedy_pickup_request_id && o.speedy_pickup_requests?.status === 'requested')
        .map((o) => [o.speedy_pickup_request_id!, o.speedy_pickup_requests!]),
    ).entries(),
  );
  const pendingDropoffCount = orders.filter(
    (o) =>
      o.speedy_waybill_id &&
      o.speedy_sender_mode === 'dropoff' &&
      !o.speedy_pickup_request_id &&
      !isFinalSpeedyStatus(o.speedy_status),
  ).length;

  return (
    <div className="space-y-6">
      {/* Cycle Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-semibold text-[var(--color-brand-navy)]">Цикъл:</label>
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title || c.delivery_date} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-xs text-gray-500 mb-1">Общо поръчки</div>
          <div className="text-2xl font-bold text-[var(--color-brand-navy)]">{total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-xs text-gray-500 mb-1">С товарителница</div>
          <div className="text-2xl font-bold text-green-600">{withWaybill}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-xs text-gray-500 mb-1">Без товарителница</div>
          <div className="text-2xl font-bold text-yellow-600">{pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-xs text-gray-500 mb-1">Марж</div>
          <div className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalMargin.toFixed(2)} €
          </div>
        </div>
      </div>

      {/* Actions */}
      <DispatchActions
        cycleId={selectedCycleId}
        hasPendingOrders={pending > 0}
        hasWaybills={withWaybill > 0}
        onBulkCreate={handleBulkCreate}
        isBulkCreating={isBulkCreating}
        pickupEligibleCount={pickupEligibleCount}
        onRequestPickup={() => setShowPickupModal(true)}
      />

      {/* Courier pickup info */}
      {requestedPickups.map(([requestId, pickup]) => {
        const period = formatPickupPeriod(pickup.pickup_period_from, pickup.pickup_period_to);
        return (
          <div
            key={requestId}
            className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm"
          >
            🚚 Куриер заявен за {formatYmdBg(pickup.pickup_date)}
            {period ? ` ${period}` : ''}
          </div>
        );
      })}
      {pendingDropoffCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          {pendingDropoffCount} товарителници са създадени за предаване в офис — занесете ги в офис
          или ги анулирайте и създайте отново.
        </div>
      )}

      {/* Bulk result */}
      {bulkResult && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Резултат: {bulkResult.created} създадени, {bulkResult.failed} неуспешни
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Зареждане...</div>
      ) : (
        <DispatchTable orders={orders} onRefresh={fetchOrders} />
      )}

      {showPickupModal && (
        <RequestPickupModal
          cycleId={selectedCycleId}
          eligibleCount={pickupEligibleCount}
          skippedCount={pickupSkippedCount}
          onClose={() => setShowPickupModal(false)}
          onDone={fetchOrders}
        />
      )}
    </div>
  );
}
