'use client';

import { useEffect, useState } from 'react';
import {
  formatPickupPeriod,
  formatYmdBg,
  PICKUP_SKIP_REASON_LABELS,
  type PickupSkipReason,
} from '@/lib/constants/speedy';

interface RequestPickupModalProps {
  cycleId: string;
  eligibleCount: number;
  skippedCount: number;
  onClose: () => void;
  onDone: () => void;
}

interface PickupTerm {
  date: string;
  cutoff: string;
}

interface PickupResult {
  requestId: string;
  pickupPeriodFrom: string | null;
  pickupPeriodTo: string | null;
  included: Array<{ orderId: string; orderNumber: string; waybillId: string }>;
  skipped: Array<{ orderId: string; orderNumber: string; reason: PickupSkipReason }>;
  unconfirmed: string[];
  warning?: string;
}

export default function RequestPickupModal({
  cycleId,
  eligibleCount,
  skippedCount,
  onClose,
  onDone,
}: RequestPickupModalProps) {
  const [terms, setTerms] = useState<PickupTerm[] | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [visitEndTime, setVisitEndTime] = useState('17:00');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSkipped, setErrorSkipped] = useState<PickupResult['skipped']>([]);
  const [result, setResult] = useState<{ date: string; data: PickupResult } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/speedy/pickup/terms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setTermsError(json?.error ?? `Грешка (${res.status}).`);
          return;
        }
        const cutoffs: PickupTerm[] = json?.cutoffs ?? [];
        setTerms(cutoffs);
        if (cutoffs.length === 0) {
          setTermsError('Speedy не върна налични дати за взимане.');
        } else {
          setPickupDate(cutoffs[0].date);
        }
        if (json?.defaults) {
          setVisitEndTime(json.defaults.visitEndTime || '17:00');
          setContactName(json.defaults.contactName || '');
          setPhone(json.defaults.phone || '');
        }
      } catch {
        if (!cancelled) setTermsError('Мрежова грешка при зареждане на датите за взимане.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  function handleClose() {
    if (!submitting) onClose();
  }

  const canSubmit =
    !submitting && !termsError && !!terms && !!pickupDate && !!visitEndTime && eligibleCount > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setErrorSkipped([]);

    try {
      const res = await fetch('/api/admin/speedy/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          pickupDate,
          visitEndTime,
          contactName: contactName.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? `Грешка (${res.status}).`);
        setErrorSkipped(json?.skipped ?? []);
        return;
      }
      setResult({ date: pickupDate, data: json as PickupResult });
      onDone();
    } catch {
      setError('Мрежова грешка. Опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderSkipped(skipped: PickupResult['skipped']) {
    if (skipped.length === 0) return null;
    return (
      <div className="text-sm">
        <p className="font-medium text-gray-700 mb-1">Пропуснати ({skipped.length}):</p>
        <ul className="text-gray-600 space-y-0.5 max-h-32 overflow-y-auto">
          {skipped.map((s) => (
            <li key={s.orderId}>
              <span className="font-mono">{s.orderNumber}</span> — {PICKUP_SKIP_REASON_LABELS[s.reason]}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const period = result
    ? formatPickupPeriod(result.data.pickupPeriodFrom, result.data.pickupPeriodTo)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-4">Заявка за куриер</h3>

        {result ? (
          <div className="space-y-4">
            <div className="text-sm rounded-lg px-4 py-3 bg-green-50 text-green-700 border border-green-200">
              {period
                ? `Куриерът е заявен за ${formatYmdBg(result.date)}, между ${period}.`
                : `Куриерът е заявен за ${formatYmdBg(result.date)}.`}{' '}
              Включени товарителници: {result.data.included.length}.
            </div>
            {result.data.warning && (
              <div className="text-sm rounded-lg px-4 py-3 bg-amber-50 text-amber-800 border border-amber-200">
                {result.data.warning}
              </div>
            )}
            {result.data.unconfirmed.length > 0 && (
              <div className="text-sm rounded-lg px-4 py-3 bg-amber-50 text-amber-800 border border-amber-200">
                Speedy не потвърди следните товарителници в заявката — проверете в Speedy:{' '}
                <span className="font-mono">{result.data.unconfirmed.join(', ')}</span>
              </div>
            )}
            {renderSkipped(result.data.skipped)}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Затвори
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label htmlFor="pickup-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Дата за взимане
                </label>
                {terms === null && !termsError ? (
                  <p className="text-sm text-gray-500">Зареждане на дати от Speedy...</p>
                ) : (
                  <select
                    id="pickup-date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    disabled={!!termsError || submitting}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {(terms ?? []).map((t) => (
                      <option key={t.date} value={t.date}>
                        {formatYmdBg(t.date)} (до {t.cutoff.slice(11, 16)})
                      </option>
                    ))}
                  </select>
                )}
                {termsError && <p className="text-sm text-red-600 mt-1">{termsError}</p>}
              </div>

              <div>
                <label htmlFor="pickup-visit-end" className="block text-sm font-medium text-gray-700 mb-1">
                  Краен час за посещение
                </label>
                <input
                  id="pickup-visit-end"
                  type="time"
                  value={visitEndTime}
                  onChange={(e) => setVisitEndTime(e.target.value)}
                  disabled={submitting}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pickup-contact" className="block text-sm font-medium text-gray-700 mb-1">
                    Лице за контакт
                  </label>
                  <input
                    id="pickup-contact"
                    type="text"
                    maxLength={60}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    disabled={submitting}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pickup-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон
                  </label>
                  <input
                    id="pickup-phone"
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-700">
                Ще бъдат включени {eligibleCount} товарителници.
                {skippedCount > 0 && ` ${skippedCount} пропуснати (офис / вече заявени).`}
              </p>

              <div className="text-sm rounded-lg px-4 py-3 bg-amber-50 text-amber-800 border border-amber-200">
                След заявката товарителниците не могат да бъдат анулирани през системата.
              </div>

              {error && (
                <div className="text-sm rounded-lg px-4 py-3 bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}
              {renderSkipped(errorSkipped)}
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
                disabled={!canSubmit}
                className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Заявяване...' : 'Заяви куриер'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
