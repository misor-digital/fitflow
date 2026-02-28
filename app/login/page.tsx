import { redirect } from 'next/navigation';
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
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-8">
          Вход
        </h1>
        <LoginForm callbackError={callbackError} next={next} />
      </div>
    </div>
  );
}
