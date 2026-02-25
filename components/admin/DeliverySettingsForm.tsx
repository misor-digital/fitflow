'use client';

import { useState, useMemo } from 'react';
import type { DeliveryConfig } from '@/lib/delivery';

interface DeliverySettingsFormProps {
  config: DeliveryConfig;
}

/**
 * Client-side calculation of next delivery date for live preview.
 * Mirrors the server-side `calculateNextDeliveryDate` logic.
 */
function calculatePreviewDate(deliveryDay: number, firstDate: string | null): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check first delivery override
  if (firstDate) {
    const [y, m, d] = firstDate.split('-').map(Number);
    if (y && m && d) {
      const first = new Date(y, m - 1, d);
      if (first >= today) {
        return formatDate(first);
      }
    }
  }

  // Normal: find next deliveryDay
  const year = today.getFullYear();
  const month = today.getMonth();

  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(deliveryDay, lastDay);
  const thisMonth = new Date(year, month, clampedDay);

  if (thisMonth > today) {
    return formatDate(thisMonth);
  }

  // Next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextLastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextClamped = Math.min(deliveryDay, nextLastDay);
  return formatDate(new Date(nextYear, nextMonth, nextClamped));
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function DeliverySettingsForm({ config }: DeliverySettingsFormProps) {
  const [deliveryDay, setDeliveryDay] = useState(config.deliveryDay);
  const [firstDeliveryDate, setFirstDeliveryDate] = useState(config.firstDeliveryDate ?? '');
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(config.subscriptionEnabled);
  const [revealedBoxEnabled, setRevealedBoxEnabled] = useState(config.revealedBoxEnabled);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track which fields changed from initial config
  const changes = useMemo(() => {
    const c: { key: string; value: string }[] = [];
    if (deliveryDay !== config.deliveryDay) {
      c.push({ key: 'SUBSCRIPTION_DELIVERY_DAY', value: String(deliveryDay) });
    }
    if ((firstDeliveryDate || '') !== (config.firstDeliveryDate || '')) {
      c.push({ key: 'FIRST_DELIVERY_DATE', value: firstDeliveryDate });
    }
    if (subscriptionEnabled !== config.subscriptionEnabled) {
      c.push({ key: 'SUBSCRIPTION_ENABLED', value: String(subscriptionEnabled) });
    }
    if (revealedBoxEnabled !== config.revealedBoxEnabled) {
      c.push({ key: 'REVEALED_BOX_ENABLED', value: String(revealedBoxEnabled) });
    }
    return c;
  }, [deliveryDay, firstDeliveryDate, subscriptionEnabled, revealedBoxEnabled, config]);

  const hasChanges = changes.length > 0;

  // Live preview of next delivery date
  const previewDate = useMemo(
    () => calculatePreviewDate(deliveryDay, firstDeliveryDate || null),
    [deliveryDay, firstDeliveryDate],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (deliveryDay < 1 || deliveryDay > 28 || !Number.isInteger(deliveryDay)) {
      setError('Денят трябва да е цяло число между 1 и 28.');
      return;
    }

    setSaving(true);

    try {
      // Save each changed key
      for (const change of changes) {
        const res = await fetch('/api/admin/settings/delivery', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Грешка при запазване на ${change.key}.`);
          setSaving(false);
          return;
        }
      }

      setSuccess('Настройките са запазени.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Грешка при запазване на настройките.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Next delivery preview */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        Следваща доставка ще бъде на: <strong>{previewDate}</strong>
      </div>

      {/* Delivery Day */}
      <div>
        <label htmlFor="deliveryDay" className="block text-sm font-semibold text-gray-700 mb-1">
          Ден на доставка (месечна)
        </label>
        <input
          id="deliveryDay"
          type="number"
          min={1}
          max={28}
          value={deliveryDay}
          onChange={(e) => setDeliveryDay(parseInt(e.target.value, 10) || 1)}
          className="w-32 border rounded-lg px-3 py-2 text-sm focus:border-[var(--color-brand-orange)] focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Ден от месеца (1-28). Ако месецът е по-кратък, се използва последният ден.
        </p>
      </div>

      {/* First Delivery Date */}
      <div>
        <label htmlFor="firstDate" className="block text-sm font-semibold text-gray-700 mb-1">
          Дата на първа доставка
        </label>
        <input
          id="firstDate"
          type="date"
          value={firstDeliveryDate}
          onChange={(e) => setFirstDeliveryDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:border-[var(--color-brand-orange)] focus:outline-none"
        />
        {firstDeliveryDate && (
          <button
            type="button"
            onClick={() => setFirstDeliveryDate('')}
            className="ml-2 text-xs text-red-500 hover:underline"
          >
            Изчисти
          </button>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Ако е зададена и е в бъдещето, тя ще бъде следващата дата на доставка вместо автоматичната.
        </p>
      </div>

      {/* Subscription Enabled */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-semibold text-gray-700">Абонаментна система</p>
          <p className="text-xs text-gray-500">
            Активира/деактивира абонаментния модул за клиентите.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={subscriptionEnabled}
            onChange={(e) => setSubscriptionEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-orange)]" />
        </label>
      </div>

      {/* Revealed Box Enabled */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-semibold text-gray-700">Разкрита кутия (еднократна)</p>
          <p className="text-xs text-gray-500">
            Позволява на потребителите да видят съдържанието на текущата кутия.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={revealedBoxEnabled}
            onChange={(e) => setRevealedBoxEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-orange)]" />
        </label>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || !hasChanges}
        className="bg-[var(--color-brand-orange)] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Запазване...' : 'Запази'}
      </button>
    </form>
  );
}
