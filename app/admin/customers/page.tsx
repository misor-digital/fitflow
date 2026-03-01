import { requireStaff } from '@/lib/auth';
import { CUSTOMER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getCustomersPaginated, getCustomersStats } from '@/lib/data';
import { CustomersTable } from '@/components/admin/CustomersTable';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Клиенти | Администрация | FitFlow',
};

const PER_PAGE = 20;

interface CustomersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    subscriber?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireStaff([...CUSTOMER_VIEW_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search?.trim();
  const subscriber = params.subscriber;

  const isSubscriber = subscriber === 'true' ? true : subscriber === 'false' ? false : undefined;

  const [{ customers, total }, stats] = await Promise.all([
    getCustomersPaginated(page, PER_PAGE, {
      search: search || undefined,
      isSubscriber,
    }),
    getCustomersStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      search: params.search,
      subscriber: params.subscriber,
      page: params.page,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/customers${qs ? `?${qs}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Клиенти
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {stats.total}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500">Общо клиенти</p>
          <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Абонати</p>
          <p className="text-2xl font-bold text-green-700">{stats.subscribers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[var(--color-brand-orange)]">
          <p className="text-sm text-gray-500">Нови този месец</p>
          <p className="text-2xl font-bold text-[var(--color-brand-orange)]">{stats.newThisMonth}</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="search"
          type="text"
          placeholder="Търси по име..."
          defaultValue={search ?? ''}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <select
          name="subscriber"
          defaultValue={subscriber ?? ''}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички</option>
          <option value="true">Абонати</option>
          <option value="false">Не абонати</option>
        </select>

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Търси
        </button>

        {(search || subscriber) && (
          <Link
            href="/admin/customers"
            className="text-sm text-gray-500 hover:text-gray-700 self-center underline"
          >
            Изчисти
          </Link>
        )}
      </form>

      {/* Table */}
      {customers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Няма намерени клиенти.</p>
          {(search || subscriber) && (
            <Link
              href="/admin/customers"
              className="text-[var(--color-brand-orange)] hover:underline text-sm"
            >
              Нулирай филтрите
            </Link>
          )}
        </div>
      ) : (
        <>
          <CustomersTable
            customers={customers}
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
