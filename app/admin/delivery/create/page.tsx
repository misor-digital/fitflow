import { requireStaff } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getDeliveryConfigMap, getDeliveryCycles } from '@/lib/data';
import {
  getDeliveryConfig,
  calculateNextNDeliveryDates,
  formatDeliveryDate,
  formatMonthYear,
} from '@/lib/delivery';
import { CreateCycleForm } from '@/components/admin/CreateCycleForm';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нов цикъл | Доставки | Администрация | FitFlow',
};

export default async function CreateDeliveryCyclePage() {
  await requireStaff([...STAFF_MANAGEMENT_ROLES]);

  const [configMap, existingCycles] = await Promise.all([
    getDeliveryConfigMap(),
    getDeliveryCycles(),
  ]);

  const config = getDeliveryConfig(configMap);
  const suggestedDates = calculateNextNDeliveryDates(config, 3);

  // Filter out dates that already have a cycle
  const existingDates = new Set(existingCycles.map((c) => c.delivery_date));
  const availableDates = suggestedDates
    .map((d) => {
      const iso = d.toISOString().split('T')[0];
      return {
        value: iso,
        label: formatDeliveryDate(iso),
        monthYear: formatMonthYear(iso),
        taken: existingDates.has(iso),
      };
    });

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

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Нов цикъл на доставка
      </h1>

      <CreateCycleForm availableDates={availableDates} />
    </div>
  );
}
