import { requireStaff } from '@/lib/auth';

export default async function AnalyticsPage() {
  await requireStaff(['super_admin', 'admin', 'analyst', 'marketing']);
  return <h1 className="text-2xl font-bold">Анализи</h1>;
}
