'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderPromoActionProps {
  orderId: string;
  currentPromo: string | null;
  currentDiscount: number | null;
  orderStatus: string;
  onSuccess: () => void;
}

interface PromoOption {
  code: string;
  discount_percent: number;
}

export default function OrderPromoAction({
  orderId,
  currentPromo,
  currentDiscount,
  orderStatus,
  onSuccess,
}: OrderPromoActionProps) {
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState<'apply' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [promoOptions, setPromoOptions] = useState<PromoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch active promo codes for dropdown
  useEffect(() => {
    if (orderStatus !== 'pending' && orderStatus !== 'confirmed') return;
    let cancelled = false;
    setLoadingOptions(true);
    fetch('/api/admin/promo?status=active&limit=100&sort=code-asc')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { promos: PromoOption[] }) => {
        if (!cancelled) setPromoOptions(data.promos);
      })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [orderStatus]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const callPromoApi = useCallback(
    async (promoCode: string | null, actionNotes?: string) => {
      const res = await fetch(`/api/admin/order/${orderId}/promo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode, notes: actionNotes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? 'Възникна грешка',
        );
      }
      return data;
    },
    [orderId],
  );

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setError(null);
    setSuccess(null);
    setLoading('apply');

    try {
      await callPromoApi(trimmed, notes.trim() || undefined);
      setCode('');
      setNotes('');
      setSuccess('Промо кодът е приложен успешно.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка');
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    if (
      !window.confirm(
        `Премахване на промо код "${currentPromo}" и преизчисляване на цената?`,
      )
    )
      return;

    setError(null);
    setSuccess(null);
    setLoading('remove');

    try {
      await callPromoApi(null, notes.trim() || undefined);
      setCode('');
      setNotes('');
      setSuccess('Промо кодът е премахнат успешно.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Възникна грешка');
    } finally {
      setLoading(null);
    }
  };

  if (orderStatus !== 'pending' && orderStatus !== 'confirmed') return null;

  const disabled = loading !== null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border bg-gray-50 p-3 text-sm">
      <p className="font-medium text-[var(--color-brand-navy)]">Промо код</p>

      <div className="flex flex-wrap items-end gap-2">
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={disabled || loadingOptions}
          className="w-48 rounded border bg-white px-2 py-1.5 font-mono text-sm disabled:opacity-50"
        >
          <option value="">
            {loadingOptions ? 'Зареждане...' : '— Избери код —'}
          </option>
          {promoOptions.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} (-{p.discount_percent}%)
            </option>
          ))}
        </select>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Причина (по избор)"
          disabled={disabled}
          className="min-w-[120px] flex-1 rounded border px-2 py-1.5 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || !code.trim()}
          className="rounded bg-[var(--color-brand-orange)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading === 'apply' ? '...' : 'Приложи'}
        </button>
      </div>

      {currentPromo && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            Текущ: {currentPromo} (-{currentDiscount}%)
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {loading === 'remove' ? '...' : 'Премахни'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </div>
  );
}
