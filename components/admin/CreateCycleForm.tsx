'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface AvailableDate {
  value: string;
  label: string;
  monthYear: string;
  taken: boolean;
}

interface CreateCycleFormProps {
  availableDates: AvailableDate[];
}

export function CreateCycleForm({ availableDates }: CreateCycleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const firstAvailable = availableDates.find((d) => !d.taken);
  const [selectedDate, setSelectedDate] = useState(firstAvailable?.value ?? '');
  const [customDate, setCustomDate] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [title, setTitle] = useState(firstAvailable?.monthYear ?? '');
  const [error, setError] = useState<string | null>(null);

  const effectiveDate = useCustom ? customDate : selectedDate;

  function handleDateSelect(date: AvailableDate) {
    if (date.taken) return;
    setUseCustom(false);
    setSelectedDate(date.value);
    setTitle(date.monthYear);
    setError(null);
  }

  function handleCustomDateChange(value: string) {
    setCustomDate(value);
    setUseCustom(true);
    setSelectedDate('');
    // Auto-generate title from custom date
    if (value) {
      const [y, m] = value.split('-').map(Number);
      const months = [
        'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
        'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
      ];
      if (m >= 1 && m <= 12) {
        setTitle(`${months[m - 1]} ${y}`);
      }
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!effectiveDate) {
      setError('Моля, изберете дата на доставка.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delivery_date: effectiveDate,
            title: title.trim() || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Грешка при създаване на цикъл.');
          return;
        }

        router.push(`/admin/delivery/${data.cycle.id}`);
      } catch {
        setError('Грешка при създаване на цикъл.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Date selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Дата на доставка
        </label>

        <div className="space-y-2 mb-3">
          {availableDates.map((date) => (
            <label
              key={date.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                !useCustom && selectedDate === date.value
                  ? 'border-[var(--color-brand-orange)] bg-orange-50'
                  : date.taken
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="delivery_date"
                value={date.value}
                checked={!useCustom && selectedDate === date.value}
                onChange={() => handleDateSelect(date)}
                disabled={date.taken}
                className="accent-[var(--color-brand-orange)]"
              />
              <span className="font-medium">{date.label}</span>
              <span className="text-gray-500 text-sm">({date.monthYear})</span>
              {date.taken && (
                <span className="ml-auto text-xs text-red-500 font-medium">
                  Зает
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Custom date */}
        <div
          className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
            useCustom
              ? 'border-[var(--color-brand-orange)] bg-orange-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="delivery_date"
            checked={useCustom}
            onChange={() => setUseCustom(true)}
            className="accent-[var(--color-brand-orange)]"
          />
          <span className="text-sm font-medium text-gray-700">Друга дата:</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => handleCustomDateChange(e.target.value)}
            onFocus={() => setUseCustom(true)}
            className="border rounded px-2 py-1 text-sm flex-1"
          />
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">
          Заглавие
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="напр. Март 2026"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Ако оставите празно, ще се генерира автоматично от датата.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !effectiveDate}
        className="bg-[var(--color-brand-orange)] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Създаване...' : 'Създай'}
      </button>
    </form>
  );
}
