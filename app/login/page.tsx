import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifySession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Вход | FitFlow',
};

/** Maps callback error codes to user-facing Bulgarian messages. */
const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: 'Невалиден линк за вход. Моля, опитайте отново.',
  code_expired:
    'Линкът за вход е изтекъл или вече е бил използван. Моля, заявете нов.',
  exchange_failed:
    'Грешка при потвърждаване на линка. Моля, опитайте отново или изберете друг метод за вход.',
  // Legacy fallback for any old bookmarks / cached redirects
  auth_callback_failed:
    'Грешка при вход. Моля, опитайте отново.',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // If already logged in, redirect to home
  const session = await verifySession();
  if (session) {
    redirect('/');
  }

  const { error: errorCode, next } = await searchParams;

  // Only surface known error codes — never reflect arbitrary input
  const callbackError = errorCode ? CALLBACK_ERRORS[errorCode] ?? null : null;

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
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-8">
          Вход
        </h1>
        <LoginForm callbackError={callbackError} next={next} />
      </div>
    </div>
  );
}
