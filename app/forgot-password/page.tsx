import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata = {
  title: 'Забравена парола | FitFlow',
};

export default async function ForgotPasswordPage() {
  const session = await verifySession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-8">
          Забравена парола
        </h1>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
