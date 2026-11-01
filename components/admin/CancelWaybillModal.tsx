'use client';

import { useEffect, useState } from 'react';
import { CANCEL_COMMENT_MAX, DEFAULT_CANCEL_COMMENT } from '@/lib/constants/speedy';

export interface CancelWaybillTarget {
  orderId: string;
  orderNumber: string;
  waybillId: string;
}

interface CancelWaybillModalProps {
  waybills: CancelWaybillTarget[];
  onClose: () => void;
  onDone: () => void;
}

interface BulkCancelResponse {
  total: number;
  cancelled: number;
  failed: number;
  results: Array<{
    orderId: string;
    orderNumber?: string;
    waybillId?: string;
    status: 'cancelled' | 'failed';
    error?: string;
  }>;
}

export default function CancelWaybillModal({ waybills, onClose, onDone }: CancelWaybillModalProps) {
  const [comment, setComment] = useState(DEFAULT_CANCEL_COMMENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkCancelResponse | null>(null);

  const isBulk = waybills.length > 1;
  const trimmed = comment.trim();
  const orderNumberById = new Map(waybills.map((w) => [w.orderId, w.orderNumber]));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) handleClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function handleClose() {
    if (submitting) return;
    // Refresh only once the bulk summary is dismissed — the refresh unmounts this modal
    if (bulkResult && bulkResult.cancelled > 0) onDone();
    onClose();
  }

  async function handleSubmit() {
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (!isBulk) {
        const res = await fetch('/api/admin/speedy/shipment/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: waybills[0].orderId, comment: trimmed }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setError(json?.error ?? `Грешка (${res.status}).`);
          return;
        }
        onDone();
        onClose();
        return;
      }

      const res = await fetch('/api/admin/speedy/shipment/cancel/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: waybills.map((w) => w.orderId), comment: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? `Грешка (${res.status}).`);
        return;
      }
      const data = json as BulkCancelResponse;
      setBulkResult(data);
    } catch {
      setError('Мрежова грешка. Опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  }

  const failures = bulkResult?.results.filter((r) => r.status === 'failed') ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-4">
          {isBulk ? `Анулиране на ${waybills.length} товарителници` : 'Анулиране на товарителница'}
        </h3>

        {bulkResult ? (
          <div className="space-y-4">
            <div
              className={`text-sm rounded-lg px-4 py-3 border ${
                bulkResult.failed === 0
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Анулирани: {bulkResult.cancelled}, неуспешни: {bulkResult.failed}
            </div>
            {failures.length > 0 && (
              <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {failures.map((f) => (
                  <li key={f.orderId}>
                    <span className="font-mono">
                      {f.orderNumber ?? orderNumberById.get(f.orderId) ?? f.orderId}
                    </span>{' '}
                    — {f.error}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Затвори
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <ul
                className={`text-sm border rounded-lg divide-y ${
                  waybills.length > 4 ? 'max-h-40 overflow-y-auto' : ''
                }`}
              >
                {waybills.map((w) => (
                  <li key={w.orderId} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="font-mono">{w.waybillId}</span>
                    <span className="font-mono text-gray-500">{w.orderNumber}</span>
                  </li>
                ))}
              </ul>

              <div className="text-sm rounded-lg px-4 py-3 bg-amber-50 text-amber-800 border border-amber-200">
                Анулирането е възможно само ако пратката не е заявена за взимане и не е взета от куриер.
              </div>

              <div>
                <label
                  htmlFor="cancel-waybill-comment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Причина за анулиране
                </label>
                <textarea
                  id="cancel-waybill-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={CANCEL_COMMENT_MAX}
                  rows={3}
                  disabled={submitting}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-500 text-right mt-1">
                  {comment.length}/{CANCEL_COMMENT_MAX}
                </p>
              </div>

              {error && (
                <div className="text-sm rounded-lg px-4 py-3 bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Откажи
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !trimmed}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Анулиране...' : 'Анулирай'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
