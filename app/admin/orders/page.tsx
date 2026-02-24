import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getOrdersPaginated, getOrdersCount, getBoxTypeNames } from '@/lib/data';
import { ORDER_STATUS_LABELS } from '@/lib/order/format';
import { OrdersTable } from '@/components/admin/OrdersTable';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { OrderStatus } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Поръчки | Администрация | FitFlow',
};

const PER_PAGE = 20;

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    boxType?: string;
    search?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requireStaff([...ORDER_VIEW_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = params.status as OrderStatus | undefined;
  const boxType = params.boxType;
  const search = params.search?.trim();

  const [{ orders, total }, totalAll, boxTypeNames] = await Promise.all([
    getOrdersPaginated(page, PER_PAGE, {
      status: status || undefined,
      boxType: boxType || undefined,
      search: search || undefined,
    }),
    getOrdersCount(),
    getBoxTypeNames(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const statusOptions = Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][];

  // Build URL helper for filters
  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      status: params.status,
      boxType: params.boxType,
      search: params.search,
      page: params.page,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/orders${qs ? `?${qs}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Поръчки
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {totalAll}
          </span>
        </div>
        <Link
          href="/admin/orders/legacy"
          className="text-sm text-[var(--color-brand-navy)] border border-[var(--color-brand-navy)] px-4 py-2 rounded-lg hover:bg-[var(--color-brand-navy)] hover:text-white transition-colors"
        >
          Стари предпоръчки →
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        {/* Status dropdown */}
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички статуси</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Box type dropdown */}
        <select
          name="boxType"
          defaultValue={boxType ?? ''}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Всички кутии</option>
          {Object.entries(boxTypeNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          name="search"
          type="text"
          placeholder="Търси по номер, имейл, име..."
          defaultValue={search ?? ''}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />

        <button
          type="submit"
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Търси
        </button>

        {(status || boxType || search) && (
          <Link
            href="/admin/orders"
            className="text-sm text-gray-500 hover:text-gray-700 self-center underline"
          >
            Изчисти
          </Link>
        )}
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Няма намерени поръчки.</p>
          {(status || boxType || search) && (
            <Link href="/admin/orders" className="text-[var(--color-brand-orange)] hover:underline text-sm">
              Нулирай филтрите
            </Link>
          )}
        </div>
      ) : (
        <>
          <OrdersTable
            orders={orders}
            boxTypeNames={boxTypeNames}
            total={total}
            currentPage={page}
            perPage={PER_PAGE}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-6">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
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
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
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
