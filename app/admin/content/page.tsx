import { requireStaff } from '@/lib/auth';

export default async function ContentPage() {
  await requireStaff(['super_admin', 'admin', 'content']);
  return <h1 className="text-2xl font-bold">Съдържание</h1>;
}
