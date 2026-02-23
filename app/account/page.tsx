import { requireAuth } from '@/lib/auth';
import PreorderLinkBanner from '@/components/PreorderLinkBanner';

export const metadata = {
  title: 'Моят профил | FitFlow',
};

export default async function AccountPage() {
  const { profile, email } = await requireAuth();

  return (
    <div>
      <PreorderLinkBanner />

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моят профил
      </h1>

      <div className="space-y-4">
        <div>
          <span className="text-sm text-gray-500">Име</span>
          <p className="text-lg font-medium">{profile.full_name}</p>
        </div>

        <div>
          <span className="text-sm text-gray-500">Имейл</span>
          <p className="text-lg font-medium">{email}</p>
        </div>

        {profile.phone && (
          <div>
            <span className="text-sm text-gray-500">Телефон</span>
            <p className="text-lg font-medium">{profile.phone}</p>
          </div>
        )}

        <div>
          <span className="text-sm text-gray-500">Тип акаунт</span>
          <p className="text-lg font-medium">
            {profile.user_type === 'staff' ? `Служител (${profile.staff_role})` : 'Клиент'}
          </p>
        </div>

        <div>
          <span className="text-sm text-gray-500">Акаунт създаден</span>
          <p className="text-lg font-medium">
            {new Date(profile.created_at).toLocaleDateString('bg-BG')}
          </p>
        </div>
      </div>
    </div>
  );
}
