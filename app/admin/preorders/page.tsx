import { requireStaff } from '@/lib/auth';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';

export default async function PreordersPage() {
  await requireStaff([...ORDER_VIEW_ROLES]);
  return <h1 className="text-2xl font-bold">Поръчки</h1>;
  // TODO: Preorder list with search, filters, pagination
}
