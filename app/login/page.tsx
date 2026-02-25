import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Вход | FitFlow',
};

export default async function LoginPage() {
  // If already logged in, redirect to home
  const session = await verifySession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-[var(--color-brand-navy)] mb-8">
          Вход
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
