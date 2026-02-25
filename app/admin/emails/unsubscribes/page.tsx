import { requireStaff } from '@/lib/auth';
import { getUnsubscribes, getUnsubscribeCount } from '@/lib/email/unsubscribe';
import UnsubscribesTable from '@/components/admin/UnsubscribesTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Отписани | Имейли | Администрация | FitFlow',
};

const EMAIL_ROLES = ['super_admin', 'admin', 'marketing'] as const;

interface UnsubscribesPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function UnsubscribesPage({ searchParams }: UnsubscribesPageProps) {
  await requireStaff([...EMAIL_ROLES]);

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const search = sp.search ?? undefined;
  const limit = 20;

  const [{ data, total }, totalCount] = await Promise.all([
    getUnsubscribes({ page, limit, search }),
    getUnsubscribeCount(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Отписани имейли
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Общо отписани: <strong>{totalCount}</strong>
          </p>
        </div>
      </div>

      <UnsubscribesTable
        unsubscribes={data}
        total={total}
        page={page}
        perPage={limit}
        search={search}
      />
    </div>
  );
}
