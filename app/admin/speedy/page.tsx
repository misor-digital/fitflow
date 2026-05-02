import { requireStaff } from '@/lib/auth';
import SpeedySetupClient from './SpeedySetupClient';

export default async function SpeedyAdminPage() {
  await requireStaff(['super_admin', 'admin']);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Speedy API – Настройка
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Тази страница помага за откриване на <code>clientId</code> и <code>serviceId</code> за конфигуриране в <code>.env</code>.
      </p>
      <SpeedySetupClient />
    </div>
  );
}
