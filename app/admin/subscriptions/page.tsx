import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getSubscriptionsPaginated, getSubscriptionsCount, getSubscriptionMRR, getBoxTypeNames, getEurToBgnRate } from '@/lib/data';
import { SUBSCRIPTION_STATUS_LABELS, FREQUENCY_LABELS } from '@/lib/subscription';
import { SubscriptionsTable } from '@/components/admin/SubscriptionsTable';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { SubscriptionStatus } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Абонаменти | Администрация | FitFlow',
};

const PER_PAGE = 20;

interface SubscriptionsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    boxType?: string;
    frequency?: string;
    search?: string;
  }>;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  await requireStaff([...ORDER_VIEW_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = params.status as SubscriptionStatus | undefined;
  const boxType = params.boxType;
  const frequency = params.frequency;
  const search = params.search?.trim();

  const [{ subscriptions, total }, counts, mrr, boxTypeNames, eurToBgnRate] = await Promise.all([
    getSubscriptionsPaginated(page, PER_PAGE, {
      status: status || undefined,
      boxType: boxType || undefined,
      frequency: frequency || undefined,
      search: search || undefined,
    }),
    getSubscriptionsCount(),
    getSubscriptionMRR(),
    getBoxTypeNames(),
    getEurToBgnRate(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const statusOptions = Object.entries(SUBSCRIPTION_STATUS_LABELS) as [SubscriptionStatus, string][];
  const frequencyOptions = Object.entries(FREQUENCY_LABELS);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      status: params.status,
      boxType: params.boxType,
      frequency: params.frequency,
      search: params.search,
      page: params.page,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/subscriptions${qs ? `?${qs}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Абонаменти
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {counts.total}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500">Общо абонаменти</p>
          <p className="text-2xl font-bold text-gray-700">{counts.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Активни</p>
          <p className="text-2xl font-bold text-green-700">{counts.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
          <p className="text-sm text-gray-500">На пауза</p>
          <p className="text-2xl font-bold text-amber-700">{counts.paused}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[var(--color-brand-navy)]">
          <p className="text-sm text-gray-500">MRR</p>
          <p className="text-2xl font-bold text-[var(--color-brand-navy)]">€{mrr.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-0.5">{(mrr * eurToBgnRate).toFixed(2)} лв</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <select name="status" defaultValue={status ?? ''} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Всички статуси</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select name="boxType" defaultValue={boxType ?? ''} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Всички кутии</option>
          {Object.entries(boxTypeNames).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select name="frequency" defaultValue={frequency ?? ''} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Всички честоти</option>
          {frequencyOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <input
          name="search"
          type="text"
          placeholder="Търси по име или имейл..."
          defaultValue={search ?? ''}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Търси
        </button>

        {(status || boxType || frequency || search) && (
          <Link href="/admin/subscriptions" className="text-sm text-gray-500 hover:text-gray-700 self-center underline">
            Изчисти
          </Link>
        )}
      </form>

      {/* Table */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Няма намерени абонаменти.</p>
          {(status || boxType || frequency || search) && (
            <Link href="/admin/subscriptions" className="text-[var(--color-brand-orange)] hover:underline text-sm">
              Нулирай филтрите
            </Link>
          )}
        </div>
      ) : (
        <>
          <SubscriptionsTable
            subscriptions={subscriptions}
            boxTypeNames={boxTypeNames}
            eurToBgnRate={eurToBgnRate}
            total={total}
            currentPage={page}
            perPage={PER_PAGE}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-6">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                  ← Предишна
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
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
                <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                  Следваща →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
