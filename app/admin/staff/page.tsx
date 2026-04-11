import { requireStaff } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminHelpLink } from '@/components/admin/AdminHelpLink';
import { formatDateShort } from '@/lib/utils/date';
import Link from 'next/link';

export const metadata = {
  title: 'Служители | FitFlow Admin',
};

export default async function StaffListPage() {
  await requireStaff([...STAFF_MANAGEMENT_ROLES]);

  const { data: staff, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_type', 'staff')
    .order('created_at', { ascending: false });

  if (error) {
    return <p className="text-red-600">Грешка при зареждане на данните</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">Служители</h1>
          <AdminHelpLink section="staff-management" />
        </div>
        <Link
          href="/admin/staff/invite"
          className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Покани нов
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Име</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Роля</th>
              <th className="py-3 px-4 text-sm font-medium text-gray-500">Дата</th>
            </tr>
          </thead>
          <tbody>
            {staff?.map(member => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{member.full_name}</td>
                <td className="py-3 px-4 capitalize">{member.staff_role?.replace('_', ' ')}</td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {formatDateShort(member.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
