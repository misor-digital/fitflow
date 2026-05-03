'use client';

import { useState, useMemo } from 'react';
import type { DeliveryConfig } from '@/lib/delivery';
import type { DeliveryPricing } from '@/lib/delivery/pricing';
import { formatDateShort } from '@/lib/utils/date';

interface DeliverySettingsFormProps {
  config: DeliveryConfig;
  pricing?: DeliveryPricing[];
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
        return formatDateShort(toISODate(first));
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
    return formatDateShort(toISODate(thisMonth));
  }

  // Next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextLastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextClamped = Math.min(deliveryDay, nextLastDay);
  return formatDateShort(toISODate(new Date(nextYear, nextMonth, nextClamped)));
}

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function DeliverySettingsForm({ config, pricing }: DeliverySettingsFormProps) {
  const [deliveryDay, setDeliveryDay] = useState(config.deliveryDay);
  const [firstDeliveryDate, setFirstDeliveryDate] = useState(config.firstDeliveryDate ?? '');
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(config.subscriptionEnabled);
  const [revealedBoxEnabled, setRevealedBoxEnabled] = useState(config.revealedBoxEnabled);
  const [cutoffDisplayDays, setCutoffDisplayDays] = useState(config.orderCutoffDisplayDays);
  const [cutoffWidgetsEnabled, setCutoffWidgetsEnabled] = useState(config.cutoffWidgetsEnabled);
  const [cutoffBannerEnabled, setCutoffBannerEnabled] = useState(config.cutoffBannerEnabled);
  const [cutoffPopupEnabled, setCutoffPopupEnabled] = useState(config.cutoffPopupEnabled);

  // Snapshot of what's been saved — starts as server config, updates after each successful save
  const [savedSnapshot, setSavedSnapshot] = useState({
    deliveryDay: config.deliveryDay,
    firstDeliveryDate: config.firstDeliveryDate ?? '',
    subscriptionEnabled: config.subscriptionEnabled,
    revealedBoxEnabled: config.revealedBoxEnabled,
    cutoffDisplayDays: config.orderCutoffDisplayDays,
    cutoffWidgetsEnabled: config.cutoffWidgetsEnabled,
    cutoffBannerEnabled: config.cutoffBannerEnabled,
    cutoffPopupEnabled: config.cutoffPopupEnabled,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track which fields changed from last saved state
  const changes = useMemo(() => {
    const c: { key: string; value: string }[] = [];
    if (deliveryDay !== savedSnapshot.deliveryDay) {
      c.push({ key: 'SUBSCRIPTION_DELIVERY_DAY', value: String(deliveryDay) });
    }
    if ((firstDeliveryDate || '') !== (savedSnapshot.firstDeliveryDate || '')) {
      c.push({ key: 'FIRST_DELIVERY_DATE', value: firstDeliveryDate });
    }
    if (subscriptionEnabled !== savedSnapshot.subscriptionEnabled) {
      c.push({ key: 'SUBSCRIPTION_ENABLED', value: String(subscriptionEnabled) });
    }
    if (revealedBoxEnabled !== savedSnapshot.revealedBoxEnabled) {
      c.push({ key: 'REVEALED_BOX_ENABLED', value: String(revealedBoxEnabled) });
    }
    if (cutoffDisplayDays !== savedSnapshot.cutoffDisplayDays) {
      c.push({ key: 'ORDER_CUTOFF_DISPLAY_DAYS', value: String(cutoffDisplayDays) });
    }
    if (cutoffWidgetsEnabled !== savedSnapshot.cutoffWidgetsEnabled) {
      c.push({ key: 'CUTOFF_WIDGETS_ENABLED', value: String(cutoffWidgetsEnabled) });
    }
    if (cutoffBannerEnabled !== savedSnapshot.cutoffBannerEnabled) {
      c.push({ key: 'CUTOFF_BANNER_ENABLED', value: String(cutoffBannerEnabled) });
    }
    if (cutoffPopupEnabled !== savedSnapshot.cutoffPopupEnabled) {
      c.push({ key: 'CUTOFF_POPUP_ENABLED', value: String(cutoffPopupEnabled) });
    }
    return c;
  }, [deliveryDay, firstDeliveryDate, subscriptionEnabled, revealedBoxEnabled, cutoffDisplayDays, cutoffWidgetsEnabled, cutoffBannerEnabled, cutoffPopupEnabled, savedSnapshot]);

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
      setSavedSnapshot({
        deliveryDay,
        firstDeliveryDate,
        subscriptionEnabled,
        revealedBoxEnabled,
        cutoffDisplayDays,
        cutoffWidgetsEnabled,
        cutoffBannerEnabled,
        cutoffPopupEnabled,
      });
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

      {/* Cutoff Widgets Section */}
      <div className="border-t pt-6 mt-2">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Банер и обратно броене</h3>

        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Банер и попъп (общ)</p>
            <p className="text-xs text-gray-500">
              Главен превключвател — изключва и двете наведнъж.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cutoffWidgetsEnabled}
              onChange={(e) => setCutoffWidgetsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-orange)]" />
          </label>
        </div>

        {/* Individual toggles — visually indented, disabled when master is off */}
        <div className={`ml-4 space-y-3 ${!cutoffWidgetsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Banner toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-gray-700">Плъзгащ банер</p>
              <p className="text-xs text-gray-500">
                Лентата с текст в горната част на страницата.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cutoffBannerEnabled}
                onChange={(e) => setCutoffBannerEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-orange)]" />
            </label>
          </div>

          {/* Popup toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-gray-700">Плаващ попъп</p>
              <p className="text-xs text-gray-500">
                Обратното броене в долната част на началната и поръчковата страница.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cutoffPopupEnabled}
                onChange={(e) => setCutoffPopupEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-orange)]" />
            </label>
          </div>
        </div>

        {/* Display days */}
        <div className="mt-4">
          <label htmlFor="cutoffDisplayDays" className="block text-sm font-semibold text-gray-700 mb-1">
            Показвай преди (дни)
          </label>
          <input
            id="cutoffDisplayDays"
            type="number"
            min={1}
            max={30}
            value={cutoffDisplayDays}
            onChange={(e) => setCutoffDisplayDays(parseInt(e.target.value, 10) || 5)}
            className="w-32 border rounded-lg px-3 py-2 text-sm focus:border-[var(--color-brand-orange)] focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Колко дни преди крайния срок да се показват банерът и попъпът (1-30).
          </p>
        </div>
      </div>

      {/* Delivery Pricing Section */}
      {pricing && pricing.length > 0 && (
        <div className="border-t pt-6 mt-2">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Цени за доставка</h3>
          <DeliveryPricingEditor initialPricing={pricing} />
        </div>
      )}

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

// ============================================================================
// Delivery Pricing Editor (self-contained sub-component)
// ============================================================================

const METHOD_LABELS: Record<string, string> = {
  speedy_automat: '🔒 До автомат',
  speedy_office: '📦 До офис',
  address: '🏠 До адрес',
};

function DeliveryPricingEditor({ initialPricing }: { initialPricing: DeliveryPricing[] }) {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of initialPricing) {
      map[p.deliveryMethod] = p.priceEur;
    }
    return map;
  });
  const [savedPrices, setSavedPrices] = useState<Record<string, number>>(() => ({ ...prices }));
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSuccess, setPricingSuccess] = useState<string | null>(null);

  const handlePriceChange = (method: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setPrices((prev) => ({ ...prev, [method]: num }));
    }
  };

  const handleSavePrice = async (method: string) => {
    const price = prices[method];
    if (price == null || price < 0 || price > 100) {
      setPricingError('Цената трябва да е между 0 и 100.');
      return;
    }

    setSavingMethod(method);
    setPricingError(null);
    setPricingSuccess(null);

    try {
      const res = await fetch('/api/admin/settings/delivery-pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryMethod: method, priceEur: price }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPricingError(data.error || 'Грешка при запазване.');
      } else {
        setSavedPrices((prev) => ({ ...prev, [method]: price }));
        setPricingSuccess('Цената е обновена.');
        setTimeout(() => setPricingSuccess(null), 3000);
      }
    } catch {
      setPricingError('Грешка при запазване на цената.');
    } finally {
      setSavingMethod(null);
    }
  };

  return (
    <div className="space-y-3">
      {initialPricing.map((p) => {
        const hasChanged = prices[p.deliveryMethod] !== savedPrices[p.deliveryMethod];
        return (
          <div key={p.deliveryMethod} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-700 min-w-[140px]">
              {METHOD_LABELS[p.deliveryMethod] || p.labelBg}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={prices[p.deliveryMethod] ?? 0}
                onChange={(e) => handlePriceChange(p.deliveryMethod, e.target.value)}
                className="w-20 border rounded-lg px-2 py-1.5 text-sm text-right focus:border-[var(--color-brand-orange)] focus:outline-none"
              />
              <span className="text-sm text-gray-500">€</span>
            </div>
            <button
              type="button"
              onClick={() => handleSavePrice(p.deliveryMethod)}
              disabled={!hasChanged || savingMethod === p.deliveryMethod}
              className="text-xs bg-[var(--color-brand-orange)] text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingMethod === p.deliveryMethod ? '...' : 'Запази'}
            </button>
          </div>
        );
      })}
      {pricingError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {pricingError}
        </div>
      )}
      {pricingSuccess && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          {pricingSuccess}
        </div>
      )}
      <p className="text-xs text-gray-400">
        Тези цени се показват на клиентите при поръчка и се записват в поръчката.
      </p>
    </div>
  );
}
