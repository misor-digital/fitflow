import { requireStaff } from '@/lib/auth';

export default async function PromoPage() {
  await requireStaff(['super_admin', 'admin', 'marketing']);
  return <h1 className="text-2xl font-bold">Промо кодове</h1>;
}
