import { requireStaff } from '@/lib/auth';
import { listPromoCodes, derivePromoStatus } from '@/lib/data';
import type { PromoCodeFilters, PromoStatus } from '@/lib/data/promo';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Промо кодове | Администрация | FitFlow',
};

const PER_PAGE = 20;
const PROMO_ROLES = ['super_admin', 'admin', 'marketing'] as const;

interface PromoPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    sort?: string;
  }>;
}

const STATUS_OPTIONS: [string, string][] = [
  ['', 'Всички'],
  ['active', 'Активни'],
  ['inactive', 'Неактивни'],
  ['expired', 'Изтекли'],
  ['exhausted', 'Изчерпани'],
  ['scheduled', 'Планирани'],
];

const SORT_OPTIONS: [string, string][] = [
  ['newest', 'Най-нови'],
  ['oldest', 'Най-стари'],
  ['most-used', 'Най-използвани'],
  ['code-asc', 'Код (А-Я)'],
];

const VALID_STATUSES = new Set(['active', 'inactive', 'expired', 'exhausted', 'scheduled']);
const VALID_SORTS = new Set(['newest', 'oldest', 'most-used', 'code-asc']);

function StatusBadge({ status }: { status: PromoStatus }) {
  const config: Record<PromoStatus, { label: string; className: string }> = {
    active: { label: 'Активен', className: 'bg-green-100 text-green-700' },
    inactive: { label: 'Неактивен', className: 'bg-gray-100 text-gray-600' },
    expired: { label: 'Изтекъл', className: 'bg-red-100 text-red-700' },
    exhausted: { label: 'Изчерпан', className: 'bg-amber-100 text-amber-700' },
    scheduled: { label: 'Планиран', className: 'bg-blue-100 text-blue-700' },
  };
  const c = config[status];
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function PromoPage({ searchParams }: PromoPageProps) {
  await requireStaff([...PROMO_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = VALID_STATUSES.has(params.status ?? '')
    ? (params.status as PromoCodeFilters['status'])
    : undefined;
  const search = params.search?.trim() || undefined;
  const sort = VALID_SORTS.has(params.sort ?? '')
    ? (params.sort as PromoCodeFilters['sort'])
    : 'newest';

  // Parallel fetch: all codes for stats + filtered page for table
  const [allResult, filteredResult] = await Promise.all([
    listPromoCodes({ limit: 10000 }),
    listPromoCodes({
      search,
      status: status ?? 'all',
      sort,
      page,
      limit: PER_PAGE,
    }),
  ]);

  const allCodes = allResult.data;
  const { data: promos, total } = filteredResult;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Compute stats from all codes
  const activeCount = allCodes.filter(
    (p) => derivePromoStatus(p) === 'active',
  ).length;
  const totalRedemptions = allCodes.reduce(
    (sum, p) => sum + (p.current_uses ?? 0),
    0,
  );
  const topCode =
    allCodes.length > 0
      ? allCodes.reduce((top, p) =>
          p.current_uses > top.current_uses ? p : top,
        ).code
      : null;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      search: params.search,
      status: params.status,
      sort: params.sort,
      page: params.page,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/promo${qs ? `?${qs}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Промо кодове
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {total}
          </span>
        </div>
        <Link
          href="/admin/promo/create"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 transition-opacity"
        >
          + Нов промо код
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Общо кодове</div>
          <div className="text-2xl font-bold text-[var(--color-brand-navy)]">
            {allResult.total}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Активни</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Общо използвания</div>
          <div className="text-2xl font-bold text-[var(--color-brand-orange)]">
            {totalRedemptions}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Най-използван</div>
          <div className="text-lg font-bold text-[var(--color-brand-navy)] font-mono">
            {topCode || '—'}
          </div>
        </div>
      </div>

      {/* Filter Form */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Търсене
            </label>
            <input
              type="text"
              name="search"
              defaultValue={search ?? ''}
              placeholder="Код или описание..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Статус
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)]"
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Подредба
            </label>
            <select
              name="sort"
              defaultValue={params.sort ?? 'newest'}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)]"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-navy)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Търси
          </button>
          {(search || status || (params.sort && params.sort !== 'newest')) && (
            <Link
              href="/admin/promo"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Изчисти
            </Link>
          )}
        </form>
      </div>

      {/* Table or Empty State */}
      {promos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-2">
            {search || status
              ? 'Няма намерени промо кодове с тези филтри.'
              : 'Все още няма промо кодове.'}
          </p>
          {(search || status) && (
            <Link
              href="/admin/promo"
              className="text-sm text-[var(--color-brand-orange)] hover:underline"
            >
              Изчисти филтрите
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Код
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Отстъпка
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Валидност
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Използвания
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      На потребител
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Създаден
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {promos.map((promo) => {
                    const derivedStatus = derivePromoStatus(promo);
                    return (
                      <tr key={promo.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-sm">
                            {promo.code}
                          </span>
                          {promo.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                              {promo.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {promo.discount_percent}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={derivedStatus} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {promo.starts_at || promo.ends_at ? (
                            `${formatDate(promo.starts_at)} – ${formatDate(promo.ends_at)}`
                          ) : (
                            <span className="text-gray-400">
                              Без ограничение
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className="font-medium">
                            {promo.current_uses}
                          </span>
                          <span className="text-gray-400">
                            {' '}
                            / {promo.max_uses ?? '∞'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {promo.max_uses_per_user ?? '∞'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(promo.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/promo/${promo.id}/edit`}
                            className="text-sm text-[var(--color-brand-orange)] hover:underline"
                          >
                            Редактирай
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
              <div className="text-sm text-gray-500">
                Страница {page} от {totalPages} ({total} кода)
              </div>
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    ← Предишна
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 2,
                  )
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-2 text-gray-400">
                        …
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={buildUrl({ page: String(item) })}
                        className={`px-3 py-1.5 text-sm border rounded-lg ${
                          item === page
                            ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {item}
                      </Link>
                    ),
                  )}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Следваща →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
