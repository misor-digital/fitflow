import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { getDeliveryCycleById, getCycleItems } from '@/lib/data';
import { computeCycleState } from '@/lib/delivery';
import { CycleDetailView } from '@/components/admin/CycleDetailView';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cycle = await getDeliveryCycleById(id);
  return {
    title: cycle
      ? `${cycle.title || cycle.delivery_date} | Доставки | Администрация | FitFlow`
      : 'Цикъл не е намерен | Администрация | FitFlow',
  };
}

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff([...ORDER_VIEW_ROLES]);

  const { id } = await params;

  const [cycle, items] = await Promise.all([
    getDeliveryCycleById(id),
    getCycleItems(id),
  ]);

  if (!cycle) {
    notFound();
  }

  const cycleState = computeCycleState(cycle);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/delivery"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад към доставки
        </Link>
      </div>

      <CycleDetailView cycle={cycle} items={items} cycleState={cycleState} />
    </div>
  );
}
