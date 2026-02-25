'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Невалиден имейл или парола');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Моля, въведете имейл адрес');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setError('Не е намерен акаунт с този имейл. Моля, регистрирайте се първо.');
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setLoading(false);
  }

  if (magicLinkSent) {
    return (
      <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
        <p className="font-semibold mb-2">Линкът е изпратен!</p>
        <p className="text-sm">
          Проверете имейла си ({email}) за магически линк за вход във системата.
        </p>
        <button
          type="button"
          onClick={() => setMagicLinkSent(false)}
          className="mt-4 text-sm text-[var(--color-brand-orange)] hover:underline"
        >
          Опитай отново
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailLogin} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Имейл
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Парола
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-brand-navy)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Зареждане...' : 'Вход'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading}
          className="text-sm text-[var(--color-brand-orange)] hover:underline"
        >
          Вход с магически линк
        </button>
      </div>

      <div className="text-center text-sm text-gray-600">
        Нямате акаунт?{' '}
        <Link href="/register" className="text-[var(--color-brand-orange)] hover:underline font-semibold">
          Регистрация
        </Link>
      </div>

      <div className="text-center text-sm">
        <Link href="/forgot-password" className="text-gray-500 hover:underline">
          Забравена парола?
        </Link>
      </div>
    </form>
  );
}
