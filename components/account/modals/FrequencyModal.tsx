'use client';

import { useState } from 'react';
import { FREQUENCY_LABELS } from '@/lib/subscription';
import { formatPriceDual } from '@/lib/catalog';

interface FrequencyModalProps {
  subscriptionId: string;
  currentFrequency: string;
  currentPriceEur: number;
  onSuccess: () => void;
  onClose: () => void;
}

// Fixed BGN rate — in production this would come from server
const EUR_TO_BGN = 1.9558;

export default function FrequencyModal({
  subscriptionId,
  currentFrequency,
  currentPriceEur,
  onSuccess,
  onClose,
}: FrequencyModalProps) {
  const newFrequency = currentFrequency === 'monthly' ? 'seasonal' : 'monthly';
  const [selected, setSelected] = useState<string>(currentFrequency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (selected === currentFrequency) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_frequency', frequency: selected }),
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

  const priceDisplay = formatPriceDual(currentPriceEur, currentPriceEur * EUR_TO_BGN);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Промяна на честотата
        </h2>

        <div className="space-y-2 mb-4">
          {(['monthly', 'seasonal'] as const).map((freq) => (
            <label
              key={freq}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected === freq
                  ? 'border-[var(--color-brand-orange)] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={freq}
                checked={selected === freq}
                onChange={() => setSelected(freq)}
                className="text-[var(--color-brand-orange)] focus:ring-[var(--color-brand-orange)]"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {FREQUENCY_LABELS[freq]}
                </span>
                {freq === currentFrequency && (
                  <span className="ml-2 text-[10px] text-gray-500">(текущо)</span>
                )}
              </div>
            </label>
          ))}
        </div>

        {selected !== currentFrequency && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 mb-4">
            <p className="text-sm text-blue-800">
              {selected === 'seasonal'
                ? `Ще получавате кутия на всеки 3 месеца. Цената остава ${priceDisplay}.`
                : `Ще получавате кутия всеки месец. Цената остава ${priceDisplay}.`}
            </p>
          </div>
        )}

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
            onClick={handleSave}
            disabled={loading || selected === currentFrequency}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Запазване...' : 'Запази'}
          </button>
        </div>
      </div>
    </div>
  );
}
