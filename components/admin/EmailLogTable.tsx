'use client';

/**
 * Email Log Table Component
 *
 * Client component with filters, pagination, search, and expandable row details.
 * Fetches from GET /api/admin/emails with query params.
 */

import { useState, useEffect, useCallback, useTransition } from 'react';
import type { EmailSendLogRow, EmailLogStatusEnum } from '@/lib/supabase/types';

const PER_PAGE = 50;

// ============================================================================
// Helpers
// ============================================================================

/** Partially mask an email: i***@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/** Format timestamp for display */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Truncate text to N chars */
function truncate(text: string | null, max: number): string {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ============================================================================
// Status / Type Badges
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  sent: { label: 'Изпратен', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Доставен', className: 'bg-green-100 text-green-700' },
  opened: { label: 'Отворен', className: 'bg-purple-100 text-purple-700' },
  clicked: { label: 'Кликнат', className: 'bg-orange-100 text-orange-700' },
  bounced: { label: 'Отхвърлен', className: 'bg-red-100 text-red-700' },
  failed: { label: 'Неуспешен', className: 'bg-red-100 text-red-700' },
  spam: { label: 'Спам', className: 'bg-red-200 text-red-800' },
  blocked: { label: 'Блокиран', className: 'bg-gray-200 text-gray-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  transactional: { label: 'Транзакционен', className: 'bg-blue-50 text-blue-600' },
  campaign: { label: 'Кампания', className: 'bg-amber-50 text-amber-700' },
};

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? { label: type, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

// ============================================================================
// Expanded Row Details
// ============================================================================

function ExpandedRow({ row }: { row: EmailSendLogRow }) {
  const webhookEvents = Array.isArray(row.webhook_events) ? row.webhook_events : [];

  return (
    <tr>
      <td colSpan={7} className="px-4 py-4 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Details */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Детайли</h4>
            <dl className="space-y-1">
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-[130px]">Получател:</dt>
                <dd className="text-gray-800">{row.recipient_email}</dd>
              </div>
              {row.recipient_name && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 min-w-[130px]">Име:</dt>
                  <dd className="text-gray-800">{row.recipient_name}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-[130px]">Категория:</dt>
                <dd className="text-gray-800">{row.email_category}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 min-w-[130px]">Тема:</dt>
                <dd className="text-gray-800">{row.subject || '—'}</dd>
              </div>
              {row.brevo_message_id && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 min-w-[130px]">Brevo ID:</dt>
                  <dd className="text-gray-800 text-xs font-mono break-all">{row.brevo_message_id}</dd>
                </div>
              )}
              {row.error && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 min-w-[130px]">Грешка:</dt>
                  <dd className="text-red-600">{row.error}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Webhook Timeline */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Webhook събития</h4>
            {webhookEvents.length === 0 ? (
              <p className="text-gray-400 text-xs">Няма получени webhook събития</p>
            ) : (
              <ul className="space-y-1.5">
                {(webhookEvents as Array<{ event?: string; timestamp?: string; reason?: string; link?: string }>).map((ev, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 min-w-[120px]">
                      {ev.timestamp ? formatDate(ev.timestamp) : '—'}
                    </span>
                    <StatusBadge status={ev.event ?? 'unknown'} />
                    {ev.reason && <span className="text-gray-500 truncate">{ev.reason}</span>}
                    {ev.link && (
                      <span className="text-blue-500 truncate" title={ev.link}>
                        {truncate(ev.link, 40)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const STATUS_OPTIONS: [EmailLogStatusEnum, string][] = [
  ['sent', 'Изпратен'],
  ['delivered', 'Доставен'],
  ['opened', 'Отворен'],
  ['clicked', 'Кликнат'],
  ['bounced', 'Отхвърлен'],
  ['failed', 'Неуспешен'],
  ['spam', 'Спам'],
  ['blocked', 'Блокиран'],
];

const TYPE_OPTIONS: ['transactional' | 'campaign', string][] = [
  ['transactional', 'Транзакционен'],
  ['campaign', 'Кампания'],
];

export default function EmailLogTable() {
  const [logs, setLogs] = useState<EmailSendLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PER_PAGE));
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    try {
      const res = await fetch(`/api/admin/emails?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setLogs(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    }
  }, [page, type, status, search, dateFrom, dateTo]);

  useEffect(() => {
    startTransition(() => {
      fetchLogs();
    });
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  }

  function handleClear() {
    setSearch('');
    setType('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const hasFilters = search || type || status || dateFrom || dateTo;

  return (
    <div>
      {/* Filters */}
      <form onSubmit={handleFilter} className="flex flex-wrap gap-3 mb-6">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички типове</option>
          {TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички статуси</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="От дата"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="До дата"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Търси по имейл..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Търси
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 self-center underline"
          >
            Изчисти
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Получател</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Тип</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Тема</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Статус</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Изпратен</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Доставен</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Отворен</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isPending && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    Зареждане...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    {hasFilters ? 'Няма намерени записи.' : 'Няма имейл записи.'}
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <>
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        expandedId === row.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {maskEmail(row.recipient_email)}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={row.email_type} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={row.subject ?? ''}>
                        {truncate(row.subject, 50)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                        {formatDate(row.delivered_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                        {formatDate(row.opened_at)}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <ExpandedRow key={`exp-${row.id}`} row={row} />
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-2 mt-6">
          {page > 1 && (
            <button
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
            >
              ← Предишна
            </button>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
              if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`px-3 py-1.5 text-sm border rounded-lg ${
                    item === page
                      ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ),
            )}

          {page < totalPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
            >
              Следваща →
            </button>
          )}

          <span className="text-xs text-gray-400 ml-2">
            {total.toLocaleString('bg-BG')} записа
          </span>
        </nav>
      )}
    </div>
  );
}
