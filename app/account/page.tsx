import { requireAuth } from '@/lib/auth';
import { getPreordersByUser } from '@/lib/data';
import PasswordSetupBanner from '@/components/account/PasswordSetupBanner';
import UnlinkedPreordersBanner from '@/components/account/UnlinkedPreordersBanner';
import ExpiringPreordersBanner from '@/components/account/ExpiringPreordersBanner';

export const metadata = {
  title: 'Моят профил | FitFlow',
};

export default async function AccountPage() {
  const { profile, email, userId } = await requireAuth();

  // Count preorders expiring within 14 days
  const preorders = await getPreordersByUser(userId);
  const now = new Date();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const expiringCount = preorders.filter((p) => {
    if (p.conversion_status !== 'pending' || !p.conversion_token_expires_at) return false;
    const expiresAt = new Date(p.conversion_token_expires_at);
    return expiresAt > now && expiresAt.getTime() - now.getTime() <= fourteenDaysMs;
  }).length;

  return (
    <div>

      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моят профил
      </h1>

      <PasswordSetupBanner />
      <UnlinkedPreordersBanner />
      <ExpiringPreordersBanner expiringCount={expiringCount} />

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
