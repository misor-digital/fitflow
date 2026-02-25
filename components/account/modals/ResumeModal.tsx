'use client';

import { useState } from 'react';
import { formatDeliveryDate } from '@/lib/delivery';

interface ResumeModalProps {
  subscriptionId: string;
  nextDeliveryDate: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ResumeModal({
  subscriptionId,
  nextDeliveryDate,
  onSuccess,
  onClose,
}: ResumeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResume = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Подновяване на абонамента
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Ще подновим абонамента ви.
          {nextDeliveryDate
            ? ` Следващата доставка ще бъде на ${formatDeliveryDate(nextDeliveryDate)}.`
            : ''}
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Отказ
          </button>
          <button
            onClick={handleResume}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Обработка...' : 'Подновяване'}
          </button>
        </div>
      </div>
    </div>
  );
}
