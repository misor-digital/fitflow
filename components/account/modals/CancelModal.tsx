'use client';

import { useState } from 'react';

const CANCELLATION_REASONS = [
  'Твърде скъпо',
  'Не ми харесва съдържанието',
  'Нямам нужда повече',
  'Качеството не отговаря на очакванията',
  'Друго',
] as const;

interface CancelModalProps {
  subscriptionId: string;
  onSuccess: () => void;
  onPauseInstead: () => void;
  onClose: () => void;
}

export default function CancelModal({
  subscriptionId,
  onSuccess,
  onPauseInstead,
  onClose,
}: CancelModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalReason =
    selectedReason === 'Друго' ? customReason.trim() : selectedReason;

  const canSubmit = !!finalReason && finalReason.length > 0 && finalReason.length <= 1000;

  const handleCancel = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: finalReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Възникна грешка.');
        return;
      }

      onSuccess();
    } catch {
      setError('Възникна грешка. Моля, опитайте отново.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
              Отказване на абонамента
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Сигурни ли сте? Можете вместо това да спрете абонамента временно и да го подновите по-късно.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  onClose();
                  onPauseInstead();
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 transition-opacity"
              >
                ⏸ Спри временно
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Искам да откажа
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Затвори
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
              Причина за отказване
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Моля, споделете защо искате да откажете абонамента:
            </p>

            <div className="space-y-2 mb-4">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'border-[var(--color-brand-orange)] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellation-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="text-[var(--color-brand-orange)] focus:ring-[var(--color-brand-orange)]"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'Друго' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Опишете причината..."
                maxLength={1000}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent resize-none mb-4"
              />
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Назад
              </button>
              <button
                onClick={handleCancel}
                disabled={!canSubmit || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Обработка...' : 'Отказване на абонамента'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
