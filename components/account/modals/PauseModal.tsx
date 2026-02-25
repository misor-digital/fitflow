'use client';

import { useState } from 'react';

interface PauseModalProps {
  subscriptionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PauseModal({ subscriptionId, onSuccess, onClose }: PauseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePause = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
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
          Пауза на абонамента
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Ще пропуснете следващата доставка. Можете да подновите абонамента по всяко време.
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
            onClick={handlePause}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Обработка...' : 'Спри временно'}
          </button>
        </div>
      </div>
    </div>
  );
}
