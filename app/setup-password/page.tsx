import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import SetPasswordForm from './SetPasswordForm';

export const metadata = {
  title: 'Настройка на парола | FitFlow',
};

export default async function SetupPasswordPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-[var(--color-brand-navy)] mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Начало
        </Link>
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-4">
          Добре дошли, {session.profile.full_name}!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Задайте парола за вашия акаунт или продължете без нея.
        </p>
        <SetPasswordForm />
      </div>
    </div>
  );
}
