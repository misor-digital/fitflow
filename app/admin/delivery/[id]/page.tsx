import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getDeliveryCycleById, getCycleItems, getSubscriptionsForCycle } from '@/lib/data';
import { computeCycleState } from '@/lib/delivery';
import { CycleDetailView } from '@/components/admin/CycleDetailView';
import { GenerateOrdersSection } from '@/components/admin/GenerateOrdersSection';
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
  const session = await requireStaff([...ORDER_VIEW_ROLES]);

  const { id } = await params;

  const [cycle, items] = await Promise.all([
    getDeliveryCycleById(id),
    getCycleItems(id),
  ]);

  if (!cycle) {
    notFound();
  }

  const cycleState = computeCycleState(cycle);

  // Check if admin can manage (generate orders)
  const canManage = session.profile.staff_role
    ? STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    : false;

  // Only fetch eligible subscriptions for upcoming/delivered cycles
  const showGenerateOrders =
    canManage && (cycle.status === 'upcoming' || cycle.status === 'delivered');

  let eligibleCount = 0;
  if (showGenerateOrders) {
    try {
      const eligible = await getSubscriptionsForCycle(id);
      eligibleCount = eligible.length;
    } catch {
      // Non-fatal — will show 0
    }
  }

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

      {showGenerateOrders && (
        <div className="mt-6">
          <GenerateOrdersSection
            cycleId={cycle.id}
            cycleDate={cycle.delivery_date}
            eligibleCount={eligibleCount}
          />
        </div>
      )}
    </div>
  );
}
