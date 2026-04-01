'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Recipient {
  orderId: string;
  orderNumber: string;
  email: string;
  fullEmail: string;
  fullName: string;
  hasAccount: boolean;
  boxType: string;
  boxName: string;
  conversionUrl: string;
  conversionToken: string | null;
  wantsPersonalization: boolean;
  promoCode: string | null;
  originalPriceEur: number;
  finalPriceEur: number;
  originalPriceBgn: number;
  finalPriceBgn: number;
  conversionStatus: 'none' | 'sent' | 'converted';
}

interface Cycle {
  id: string;
  deliveryDate: string;
  title: string | null;
}

interface SendResultResponse {
  dryRun: boolean;
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  recipients: Array<{
    orderId: string;
    email: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BOX_TYPE_LABELS: Record<string, string> = {
  'onetime-standard': 'Стандартна',
  'onetime-premium': 'Премиум',
  direct: 'Директна',
  'onetime-mystery': 'Мистерия',
  'onetime-revealed': 'Разкрита',
};

type AccountFilter = 'all' | 'guest' | 'registered';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrderSubscriptionCampaignPage() {
  /* ---- Core state ---- */
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---- Selection ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---- Campaign controls ---- */
  const [dryRun, setDryRun] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [campaignPromoCode, setCampaignPromoCode] = useState('');

  /* ---- Filters ---- */
  const [boxTypeFilter, setBoxTypeFilter] = useState<Set<string>>(new Set());
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ---- Derived: box types present in data ---- */
  const availableBoxTypes = useMemo(
    () => [...new Set(recipients.map((r) => r.boxType))],
    [recipients],
  );

  /* ---- Derived: filtered recipients ---- */
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return recipients.filter((r) => {
      if (boxTypeFilter.size > 0 && !boxTypeFilter.has(r.boxType)) return false;
      if (accountFilter === 'guest' && r.hasAccount) return false;
      if (accountFilter === 'registered' && !r.hasAccount) return false;
      if (
        q &&
        !r.fullName.toLowerCase().includes(q) &&
        !r.email.toLowerCase().includes(q) &&
        !r.orderNumber.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [recipients, boxTypeFilter, accountFilter, searchQuery]);

  /* ---- Derived: sendable recipients (not yet converted) ---- */
  const sendableFilteredRecipients = useMemo(
    () => filteredRecipients.filter((r) => r.conversionStatus !== 'converted'),
    [filteredRecipients],
  );

  /* ---- Derived: selected within filtered ---- */
  const selectedFilteredRecipients = useMemo(
    () => sendableFilteredRecipients.filter((r) => selectedIds.has(r.orderId)),
    [sendableFilteredRecipients, selectedIds],
  );

  /* ---- Derived: stats ---- */
  const stats = useMemo(() => {
    const total = recipients.length;
    const guestCount = recipients.filter((r) => !r.hasAccount).length;
    const registeredCount = recipients.filter((r) => r.hasAccount).length;
    const sentCount = recipients.filter((r) => r.conversionStatus === 'sent').length;
    const convertedCount = recipients.filter((r) => r.conversionStatus === 'converted').length;
    return { total, guestCount, registeredCount, sentCount, convertedCount };
  }, [recipients]);

  /* ---- Selection helpers ---- */
  const allFilteredSelected =
    sendableFilteredRecipients.length > 0 &&
    sendableFilteredRecipients.every((r) => selectedIds.has(r.orderId));

  const someFilteredSelected =
    !allFilteredSelected && sendableFilteredRecipients.some((r) => selectedIds.has(r.orderId));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const r of sendableFilteredRecipients) next.delete(r.orderId);
      } else {
        for (const r of sendableFilteredRecipients) next.add(r.orderId);
      }
      return next;
    });
  }, [allFilteredSelected, sendableFilteredRecipients]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setBoxTypeFilter(new Set());
    setAccountFilter('all');
    setSearchQuery('');
  }, []);

  /* ---- Copy conversion link ---- */
  const buildConversionUrl = useCallback(
    (token: string) => {
      const base = `${window.location.origin}/subscription/convert?token=${token}`;
      const promo = campaignPromoCode.trim();
      return promo ? `${base}&promo=${encodeURIComponent(promo)}` : base;
    },
    [campaignPromoCode],
  );

  const handleCopyLink = useCallback(
    async (r: Recipient) => {
      if (!r.conversionToken) return;
      try {
        await navigator.clipboard.writeText(buildConversionUrl(r.conversionToken));
        setCopiedId(r.orderId);
        setTimeout(() => setCopiedId((prev) => (prev === r.orderId ? null : prev)), 2000);
      } catch {
        // Fallback: ignore clipboard errors
      }
    },
    [buildConversionUrl],
  );

  /* ---- Fetch recipients ---- */
  const fetchRecipients = useCallback(async (cycleId?: string) => {
    setLoading(true);
    setError(null);
    setSendResult(null);

    try {
      const url = cycleId
        ? `/api/admin/order-subscription-campaign?cycleId=${encodeURIComponent(cycleId)}`
        : '/api/admin/order-subscription-campaign';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Грешка при зареждане (${res.status})`);

      setRecipients(data.recipients);
      if (data.cycles) setCycles(data.cycles);
      // Select all sendable (non-converted) by default
      setSelectedIds(new Set(
        (data.recipients as Recipient[])
          .filter((r) => r.conversionStatus !== 'converted')
          .map((r) => r.orderId),
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при зареждане');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Load on mount ---- */
  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  /* ---- Cycle change handler ---- */
  const handleCycleChange = useCallback(
    (cycleId: string) => {
      setSelectedCycleId(cycleId);
      fetchRecipients(cycleId || undefined);
    },
    [fetchRecipients],
  );

  /* ---- Send handler ---- */
  const handleSend = useCallback(async () => {
    const count = selectedFilteredRecipients.length;
    if (count === 0) return;

    const message = dryRun
      ? `Dry run ще логне ${count} получателя без реално изпращане. Продължи?`
      : `Сигурни ли сте? Това ще изпрати ${count} имейла.`;
    if (!window.confirm(message)) return;

    setSending(true);
    setSendResult(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/order-subscription-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          includeIds: selectedFilteredRecipients.map((r) => r.orderId),
          campaignPromoCode: campaignPromoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Грешка при изпращане (${res.status})`);
      setSendResult(data.result);
      // Refresh recipients to reflect updated statuses
      await fetchRecipients(selectedCycleId || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при изпращане');
    } finally {
      setSending(false);
    }
  }, [selectedFilteredRecipients, dryRun, campaignPromoCode, fetchRecipients, selectedCycleId]);

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Кампания за конвертиране на поръчки в абонаменти
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Изпращане на имейли за конвертиране на еднократни поръчки в абонаменти.
        </p>
      </div>

      {/* Info box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        Тази кампания използва локален HTML шаблон и изпраща чрез Brevo (транзакционен имейл).
        Всички изпратени имейли се записват в лога.
      </div>

      {/* Controls bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Cycle selector */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="cycle-select" className="block text-xs font-medium text-gray-500 mb-1">
              Период (цикъл на доставка)
            </label>
            <select
              id="cycle-select"
              value={selectedCycleId}
              onChange={(e) => handleCycleChange(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
            >
              <option value="">Предишен период</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title ?? c.deliveryDate}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign promo code */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="promo-code" className="block text-xs font-medium text-gray-500 mb-1">
              Промо код за кампанията (по избор)
            </label>
            <input
              id="promo-code"
              type="text"
              value={campaignPromoCode}
              onChange={(e) => setCampaignPromoCode(e.target.value)}
              placeholder="напр. SUBSCRIBE20"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {!loading && recipients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Общо допустими" value={stats.total} color="gray" />
          <StatCard label="Гости (без акаунт)" value={stats.guestCount} color="orange" />
          <StatCard label="Регистрирани" value={stats.registeredCount} color="green" />
          <StatCard label="Изпратени" value={stats.sentCount} color="blue" />
          <StatCard label="Конвертирани" value={stats.convertedCount} color="emerald" />
        </div>
      )}

      {/* Filter bar */}
      {!loading && recipients.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Филтри</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Нулирай
            </button>
          </div>

          {/* Box type checkboxes */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Тип кутия:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {availableBoxTypes.map((key) => (
                <label key={key} className="inline-flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boxTypeFilter.size === 0 || boxTypeFilter.has(key)}
                    onChange={(e) =>
                      setBoxTypeFilter((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.delete(key);
                          // If all are checked, clear filter (= show all)
                          if (next.size === 0) return new Set();
                        } else {
                          // If going from "all" state, add all EXCEPT this one
                          if (prev.size === 0) {
                            for (const t of availableBoxTypes) {
                              if (t !== key) next.add(t);
                            }
                          } else {
                            next.delete(key);
                          }
                        }
                        return next;
                      })
                    }
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  {BOX_TYPE_LABELS[key] ?? key}
                </label>
              ))}
            </div>
          </div>

          {/* Account status segmented control */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Статус на акаунт:</p>
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              {([
                ['all', 'Всички'],
                ['guest', 'Гости'],
                ['registered', 'С акаунт'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAccountFilter(value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    accountFilter === value
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Търсене по име, имейл или номер на поръчка..."
              className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Count summary */}
          <p className="text-xs text-gray-500">
            Показване: <strong className="text-gray-700">{filteredRecipients.length}</strong> от{' '}
            <strong className="text-gray-700">{recipients.length}</strong> получателя
            {filteredRecipients.length < recipients.length && (
              <span className="ml-1 text-orange-600">(филтрирани)</span>
            )}
            {' · '}
            Избрани: <strong className="text-gray-700">{selectedFilteredRecipients.length}</strong>
          </p>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          Тестово изпращане (без реални имейли)
        </label>

        <button
          type="button"
          disabled={sending || selectedFilteredRecipients.length === 0}
          onClick={handleSend}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            dryRun
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {sending
            ? 'Обработка...'
            : dryRun
              ? `Dry Run (${selectedFilteredRecipients.length})`
              : `Изпрати на ${selectedFilteredRecipients.length} получатели`}
        </button>

        {campaignPromoCode.trim() && (
          <span className="text-xs text-gray-500">
            Промо код &lsquo;{campaignPromoCode.trim()}&rsquo; ще бъде включен в линковете
          </span>
        )}
      </div>

      {/* Result banner */}
      {sendResult && (
        sendResult.dryRun ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            Dry run завърши - {sendResult.skipped} получателя логнати (без реално изпращане)
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Изпратени: {sendResult.sent} | Неуспешни: {sendResult.failed}
            </div>
            {sendResult.failed > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                {sendResult.failed} имейла не бяха изпратени успешно. Проверете логовете за повече информация.
              </div>
            )}
          </div>
        )
      )}

      {/* Send results detail table */}
      {sendResult && sendResult.recipients.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Имейл', 'Статус'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sendResult.recipients.map((r, idx) => (
                <tr key={r.orderId} className="even:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{r.email}</td>
                  <td className="px-4 py-2 text-sm">
                    <SendStatusBadge status={r.status} error={r.error} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      ) : recipients.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">
          Няма допустими поръчки за избрания период.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someFilteredSelected; }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    title="Избери / Премахни всички"
                  />
                </th>
                {['Поръчка #', 'Имейл', 'Име', 'Тип кутия', 'Цена', 'Акаунт', 'Конверсия', 'Линк'].map(
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
              {filteredRecipients.map((r) => {
                const isConverted = r.conversionStatus === 'converted';
                return (
                <tr
                  key={r.orderId}
                  onClick={() => !isConverted && toggleSelectOne(r.orderId)}
                  className={`transition-colors ${
                    isConverted
                      ? 'bg-green-50/50 opacity-60'
                      : selectedIds.has(r.orderId)
                        ? 'bg-orange-50 cursor-pointer'
                        : 'even:bg-gray-50 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.orderId)}
                      disabled={isConverted}
                      onChange={() => toggleSelectOne(r.orderId)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{r.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900" title={r.fullEmail}>{r.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {BOX_TYPE_LABELS[r.boxType] ?? r.boxName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {r.finalPriceEur.toFixed(2)} €
                    <span className="text-gray-400"> / </span>
                    {r.finalPriceBgn.toFixed(2)} лв
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <AccountBadge hasAccount={r.hasAccount} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <ConversionBadge status={r.conversionStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    {r.conversionToken ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(r)}
                          title="Копирай линк"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                        >
                          {copiedId === r.orderId ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-600">Копиран</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Копирай
                            </>
                          )}
                        </button>
                        <a
                          href={buildConversionUrl(r.conversionToken)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Отвори в нов таб"
                          className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded px-1.5 py-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table footer count */}
      {!loading && recipients.length > 0 && (
        <p className="text-sm text-gray-600">
          Показани: <strong>{filteredRecipients.length}</strong> от <strong>{recipients.length}</strong> получателя
          {' · '}
          Избрани: <strong>{selectedFilteredRecipients.length}</strong>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color] ?? colorMap.gray}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function AccountBadge({ hasAccount }: { hasAccount: boolean }) {
  return hasAccount ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Регистриран
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      Гост
    </span>
  );
}

function ConversionBadge({ status }: { status: 'none' | 'sent' | 'converted' }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Изпратен
      </span>
    );
  }
  if (status === 'converted') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Конвертиран
      </span>
    );
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function SendStatusBadge({ status, error }: { status: 'sent' | 'failed' | 'skipped'; error?: string }) {
  const classes: Record<string, string> = {
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    sent: 'Изпратен',
    failed: 'Неуспешен',
    skipped: 'Пропуснат',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes[status]}`} title={error}>
      {labels[status]}
    </span>
  );
}
