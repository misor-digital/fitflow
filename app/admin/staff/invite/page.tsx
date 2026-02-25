import { requireStaff } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import InviteStaffForm from './InviteStaffForm';

export const metadata = {
  title: 'Покана за служител | FitFlow Admin',
};

export default async function InviteStaffPage() {
  const session = await requireStaff([...STAFF_MANAGEMENT_ROLES]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Покани нов служител
      </h1>
      <InviteStaffForm actorRole={session.profile.staff_role!} />
    </div>
  );
}
