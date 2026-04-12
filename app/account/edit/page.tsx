import { requireAuth } from '@/lib/auth';
import EditProfileForm from './EditProfileForm';

export const metadata = {
  title: 'Редактиране на профил | FitFlow',
};

export default async function EditProfilePage() {
  const { profile, email } = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Редактиране на профил
      </h1>
      <EditProfileForm
        initialFirstName={profile.first_name}
        initialLastName={profile.last_name}
        initialPhone={profile.phone ?? ''}
        email={email}
      />
    </div>
  );
}
