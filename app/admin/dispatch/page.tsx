import { requireStaff } from '@/lib/auth';
import { getDeliveryCyclesForDropdown } from '@/lib/data';
import DispatchDashboard from './DispatchDashboard';
import Link from 'next/link';

export default async function DispatchPage() {
  await requireStaff(['super_admin', 'admin']);
  const cycles = await getDeliveryCyclesForDropdown();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          Изпращане – Speedy
        </h1>
        <Link
          href="/admin/settings/dispatch"
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
        >
          ⚙️ Настройки
        </Link>
      </div>
      <DispatchDashboard cycles={cycles} />
    </div>
  );
}
