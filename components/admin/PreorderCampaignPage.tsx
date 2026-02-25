'use client';

import { useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Recipient {
  preorderId: string;
  orderId: string;
  email: string;
  fullName: string;
  boxType: string;
  wantsPersonalization: boolean;
  promoCode: string | null;
  conversionUrl: string;
  originalPriceEur: number | null;
  finalPriceEur: number | null;
}

interface SendResultResponse {
  dryRun: boolean;
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  recipients: Array<{
    email: string;
    fullName: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BOX_TYPE_LABELS: Record<string, string> = {
  'monthly-standard': 'Стандартна',
  'monthly-premium': 'Премиум',
  'monthly-premium-monthly': 'Премиум (месечна)',
  'monthly-premium-seasonal': 'Премиум (сезонна)',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PreorderCampaignPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---- Fetch recipients on mount ---- */
  useEffect(() => {
    let cancelled = false;

    async function fetchRecipients() {
      try {
        const res = await fetch('/api/admin/preorder-campaign');
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Грешка при зареждане (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setRecipients(data.recipients);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Неизвестна грешка');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecipients();
    return () => { cancelled = true; };
  }, []);

  /* ---- Send / Dry-run handler ---- */
  const handleSend = useCallback(
    async (dryRun: boolean) => {
      if (dryRun) {
        if (!window.confirm(`Dry run ще логне ${total} получателя без реално изпращане. Продължи?`)) return;
      } else {
        if (!window.confirm(`Сигурни ли сте? Това ще изпрати ${total} имейла.`)) return;
      }

      setSending(true);
      setResult(null);
      setError(null);

      try {
        const res = await fetch('/api/admin/preorder-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Грешка при изпращане (${res.status})`);
        }
        const data: SendResultResponse = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестна грешка');
      } finally {
        setSending(false);
      }
    },
    [total],
  );

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Предпоръчки — Конверсионна кампания
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Изпращане на имейли за конвертиране на предпоръчки в поръчки.
        </p>
      </div>

      {/* Info box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        Тази кампания използва локален HTML шаблон и изпраща чрез Brevo (транзакционен имейл).
        Всички изпратени имейли се записват в лога.
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={sending || total === 0}
          onClick={() => handleSend(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Обработка...' : '🧪 Dry Run'}
        </button>
        <button
          type="button"
          disabled={sending || total === 0}
          onClick={() => handleSend(false)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Изпращане...' : `📧 Изпрати на ${total} получателя`}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        result.dryRun ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            🧪 Dry run завърши — {result.skipped} получателя логнати (без реално изпращане)
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              ✅ Изпратени: {result.sent} | ❌ Неуспешни: {result.failed}
            </div>
            {result.failed > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                ⚠️ {result.failed} имейла не бяха изпратени успешно. Проверете логовете за повече информация.
              </div>
            )}
          </div>
        )
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 text-red-600 hover:text-red-800 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* Recipients table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-gray-400 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-500">Зареждане...</span>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">
          Няма отговарящи на условията предпоръчки.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#', 'Имейл', 'Име', 'Кутия', 'Персонализация', 'Промо код', 'Цена', 'Поръчка'].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recipients.map((r, idx) => (
                  <tr key={r.preorderId} className="even:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {BOX_TYPE_LABELS[r.boxType] ?? r.boxType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {r.wantsPersonalization ? 'да' : 'не'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {r.promoCode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {r.finalPriceEur != null
                        ? `${r.finalPriceEur.toFixed(2)} EUR`
                        : r.originalPriceEur != null
                          ? `${r.originalPriceEur.toFixed(2)} EUR`
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.orderId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600">
            Общо получатели: <strong>{total}</strong>
          </p>
        </>
      )}
    </div>
  );
}
