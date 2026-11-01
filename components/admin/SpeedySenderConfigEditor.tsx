'use client';

import { useState, useCallback } from 'react';

export interface SpeedySenderConfigValues {
  senderMode: 'pickup' | 'dropoff';
  dropoffOfficeId: string;
  contactName: string;
  phone: string;
  visitEndTime: string;
  visitFeeEur: string;
}

interface SpeedySenderConfigEditorProps {
  initialConfig: SpeedySenderConfigValues;
}

const CONFIG_KEYS: Record<keyof SpeedySenderConfigValues, string> = {
  senderMode: 'SPEEDY_SENDER_MODE',
  dropoffOfficeId: 'SPEEDY_DROPOFF_OFFICE_ID',
  contactName: 'SPEEDY_PICKUP_CONTACT_NAME',
  phone: 'SPEEDY_PICKUP_PHONE',
  visitEndTime: 'SPEEDY_PICKUP_VISIT_END_TIME',
  visitFeeEur: 'SPEEDY_PICKUP_VISIT_FEE_EUR',
};

export default function SpeedySenderConfigEditor({ initialConfig }: SpeedySenderConfigEditorProps) {
  const [saved, setSaved] = useState<SpeedySenderConfigValues>(initialConfig);
  const [values, setValues] = useState<SpeedySenderConfigValues>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const changedKeys = (Object.keys(CONFIG_KEYS) as Array<keyof SpeedySenderConfigValues>).filter(
    (k) => values[k] !== saved[k],
  );
  const hasChanges = changedKeys.length > 0;

  function update<K extends keyof SpeedySenderConfigValues>(key: K, value: SpeedySenderConfigValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    let persisted = saved;
    try {
      for (const field of changedKeys) {
        const key = CONFIG_KEYS[field];
        const value = values[field].trim();
        const res = await fetch('/api/admin/settings/delivery', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Грешка при запис на ${key}`);
        }
        persisted = { ...persisted, [field]: values[field] };
      }
      setMessage({ type: 'success', text: 'Запазено успешно.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Неизвестна грешка.' });
    } finally {
      setSaved(persisted);
      setSaving(false);
    }
  }, [changedKeys, saved, values]);

  return (
    <div className="bg-gray-50 rounded-xl border p-5 space-y-4">
      <fieldset className="text-sm">
        <legend className="block text-gray-600 font-medium mb-2">Начин на предаване</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="speedy-sender-mode"
              value="pickup"
              checked={values.senderMode === 'pickup'}
              onChange={() => update('senderMode', 'pickup')}
            />
            Куриер взима от нашия адрес (по подразбиране)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="speedy-sender-mode"
              value="dropoff"
              checked={values.senderMode === 'dropoff'}
              onChange={() => update('senderMode', 'dropoff')}
            />
            Предаване в офис на Speedy
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {values.senderMode === 'dropoff' && (
          <div>
            <label htmlFor="speedy-dropoff-office" className="block text-gray-600 font-medium mb-1">
              Dropoff офис ID
            </label>
            <input
              id="speedy-dropoff-office"
              type="number"
              step="1"
              min="1"
              value={values.dropoffOfficeId}
              onChange={(e) => update('dropoffOfficeId', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label htmlFor="speedy-pickup-contact" className="block text-gray-600 font-medium mb-1">
            Лице за контакт
          </label>
          <input
            id="speedy-pickup-contact"
            type="text"
            maxLength={60}
            value={values.contactName}
            onChange={(e) => update('contactName', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="speedy-pickup-phone" className="block text-gray-600 font-medium mb-1">
            Телефон
          </label>
          <input
            id="speedy-pickup-phone"
            type="tel"
            maxLength={20}
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="+359..."
          />
        </div>
        <div>
          <label htmlFor="speedy-pickup-visit-end" className="block text-gray-600 font-medium mb-1">
            Краен час за посещение
          </label>
          <input
            id="speedy-pickup-visit-end"
            type="time"
            value={values.visitEndTime}
            onChange={(e) => update('visitEndTime', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="speedy-pickup-fee" className="block text-gray-600 font-medium mb-1">
            Такса за посещение (EUR, по избор)
          </label>
          <input
            id="speedy-pickup-fee"
            type="number"
            step="0.01"
            min="0"
            value={values.visitFeeEur}
            onChange={(e) => update('visitFeeEur', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Само за информация — не се включва в маржа.</p>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-brand-navy)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {saving ? 'Запазване...' : 'Запази промените'}
      </button>
    </div>
  );
}
