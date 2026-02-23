import { requireStaff } from '@/lib/auth';

export default async function SettingsPage() {
  await requireStaff(['super_admin', 'admin']);
  return <h1 className="text-2xl font-bold">Настройки</h1>;
}
