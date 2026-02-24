import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getPreordersWithConversionInfo, getBoxTypeNames } from '@/lib/data';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { PreorderConversionStatus } from '@/lib/supabase/types';
import { LegacyPreordersTable } from '@/components/admin/LegacyPreordersTable';

export const metadata: Metadata = {
  title: 'Стари предпоръчки | Администрация | FitFlow',
};

const PER_PAGE = 20;

const CONVERSION_STATUS_LABELS: Record<PreorderConversionStatus, string> = {
  pending: 'Чакаща',
  converted: 'Преобразувана',
  expired: 'Изтекла',
};

const CONVERSION_STATUS_COLORS: Record<PreorderConversionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
};

interface LegacyPreordersPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function LegacyPreordersPage({ searchParams }: LegacyPreordersPageProps) {
  await requireStaff([...ORDER_VIEW_ROLES]);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [{ preorders, total }, boxTypeNames] = await Promise.all([
    getPreordersWithConversionInfo(page, PER_PAGE),
    getBoxTypeNames(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Стари предпоръчки
          </h1>
          <span className="bg-gray-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {total}
          </span>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm text-[var(--color-brand-navy)] hover:underline"
        >
          ← Обратно към поръчки
        </Link>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        Тази страница показва исторически предпоръчки. Новите поръчки са в раздел{' '}
        <Link href="/admin/orders" className="font-semibold underline">Поръчки</Link>.
      </div>

      {/* Table */}
      {preorders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">Няма предпоръчки.</p>
        </div>
      ) : (
        <>
          <LegacyPreordersTable
            preorders={preorders}
            boxTypeNames={boxTypeNames}
            conversionStatusLabels={CONVERSION_STATUS_LABELS}
            conversionStatusColors={CONVERSION_STATUS_COLORS}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-6">
              {page > 1 && (
                <Link
                  href={`/admin/orders/legacy?page=${page - 1}`}
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
                      href={`/admin/orders/legacy?page=${item}`}
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
                  href={`/admin/orders/legacy?page=${page + 1}`}
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
