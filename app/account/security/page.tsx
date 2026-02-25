import { requireAuth } from '@/lib/auth';
import ChangePasswordForm from './ChangePasswordForm';

export const metadata = {
  title: 'Сигурност | FitFlow',
};

export default async function SecurityPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Сигурност
      </h1>
      <ChangePasswordForm />
    </div>
  );
}
