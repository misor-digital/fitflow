import { requireStaff } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getDeliveryConfigMap } from '@/lib/data';
import { getDeliveryConfig } from '@/lib/delivery';
import { DeliverySettingsForm } from '@/components/admin/DeliverySettingsForm';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Настройки за доставки | Администрация | FitFlow',
};

export default async function DeliverySettingsPage() {
  await requireStaff([...STAFF_MANAGEMENT_ROLES]);

  const configMap = await getDeliveryConfigMap();
  const config = getDeliveryConfig(configMap);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Назад към настройки
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Настройки за доставки
      </h1>

      <DeliverySettingsForm config={config} />
    </div>
  );
}
