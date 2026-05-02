import { requireStaff } from '@/lib/auth';
import { getDeliveryCyclesForDropdown } from '@/lib/data';
import DispatchDashboard from './DispatchDashboard';

export default async function DispatchPage() {
  await requireStaff(['super_admin', 'admin']);
  const cycles = await getDeliveryCyclesForDropdown();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Диспечиране – Speedy
      </h1>
      <DispatchDashboard cycles={cycles} />
    </div>
  );
}
