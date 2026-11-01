'use client';

import { useState } from 'react';
import type { LabelFormat } from '@/lib/delivery/speedy/labels';

interface DispatchActionsProps {
  cycleId: string;
  hasPendingOrders: boolean;
  hasWaybills: boolean;
  onBulkCreate: () => void;
  isBulkCreating: boolean;
  pickupEligibleCount: number;
  onRequestPickup: () => void;
  calculableCount: number;
  onCalculatePrices: () => void;
  isCalculating: boolean;
  calcProgress: { done: number; total: number } | null;
}

export default function DispatchActions({
  cycleId,
  hasPendingOrders,
  hasWaybills,
  onBulkCreate,
  isBulkCreating,
  pickupEligibleCount,
  onRequestPickup,
  calculableCount,
  onCalculatePrices,
  isCalculating,
  calcProgress,
}: DispatchActionsProps) {
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('A6');
  const [senderCopy, setSenderCopy] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePrintLabels() {
    setIsPrinting(true);
    try {
      const res = await fetch('/api/admin/speedy/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, format: labelFormat, senderCopy }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Грешка при генериране на етикети.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labels-${cycleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Грешка при генериране на етикети.');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Dry-run price calculation (pickup vs drop-off) */}
      <button
        onClick={onCalculatePrices}
        disabled={calculableCount === 0 || isCalculating}
        title="Изчислява цената от Speedy за всяка поръчка без товарителница при Pick up и Drop off. Нищо не се създава."
        className="border border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] bg-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        {isCalculating
          ? `Изчисляване...${calcProgress ? ` (${calcProgress.done}/${calcProgress.total})` : ''}`
          : `Изчисли цени (${calculableCount})`}
      </button>

      {/* Bulk create waybills */}
      <button
        onClick={onBulkCreate}
        disabled={!hasPendingOrders || isBulkCreating}
        className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBulkCreating ? 'Създаване...' : 'Създай товарителници'}
      </button>

      {/* Print labels */}
      <div className="flex items-center gap-2">
        <select
          value={labelFormat}
          onChange={(e) => setLabelFormat(e.target.value as LabelFormat)}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="A6">A6</option>
          <option value="A4">A4</option>
          <option value="A4_4xA6">A4 (4×A6)</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={senderCopy}
            onChange={(e) => {
              const checked = e.target.checked;
              setSenderCopy(checked);
              if (checked) setLabelFormat('A4');
            }}
            className="rounded"
          />
          Екземпляр подател
        </label>
        <button
          onClick={handlePrintLabels}
          disabled={!hasWaybills || isPrinting}
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPrinting ? 'Генериране...' : 'Принтирай етикети'}
        </button>
      </div>

      {/* Request courier pickup */}
      <button
        onClick={onRequestPickup}
        disabled={pickupEligibleCount === 0}
        className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Заяви куриер ({pickupEligibleCount})
      </button>
    </div>
  );
}
