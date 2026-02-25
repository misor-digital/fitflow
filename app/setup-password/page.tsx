import { requireAuth } from '@/lib/auth';
import SetPasswordForm from './SetPasswordForm';

export const metadata = {
  title: 'Настройка на парола | FitFlow',
};

export default async function SetupPasswordPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-4">
          Добре дошли, {session.profile.full_name}!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Моля, задайте парола за вашия акаунт.
        </p>
        <SetPasswordForm />
      </div>
    </div>
  );
}
