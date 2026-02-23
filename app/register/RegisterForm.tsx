'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { validatePassword } from '@/lib/auth/passwordPolicy';

export default function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wantsPromos, setWantsPromos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(password);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!fullName.trim()) {
      setError('Моля, въведете вашето име');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Паролата не отговаря на изискванията');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName.trim(), is_subscriber: wantsPromos },
      },
    });

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Потребител с този имейл вече съществува'
        : 'Грешка при регистрация. Опитайте отново.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
        <p className="font-semibold mb-2">Регистрацията е успешна!</p>
        <p className="text-sm">
          Проверете имейла си ({email}) за линк за потвърждение.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Име и фамилия
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={100}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

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
        {password && (
          <ul className="mt-2 space-y-1 text-xs">
            {[
              { test: password.length >= 8, label: 'Минимум 8 символа' },
              { test: /[a-z]/.test(password), label: 'Поне една малка буква' },
              { test: /[A-Z]/.test(password), label: 'Поне една главна буква' },
              { test: /\d/.test(password), label: 'Поне една цифра' },
              { test: /[^a-zA-Z0-9]/.test(password), label: 'Поне един специален символ' },
            ].map((rule) => (
              <li key={rule.label} className={rule.test ? 'text-green-600' : 'text-gray-400'}>
                {rule.test ? '✓' : '○'} {rule.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Потвърдете паролата
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="mt-1 text-xs text-red-500">Паролите не съвпадат</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="promos"
          type="checkbox"
          checked={wantsPromos}
          onChange={(e) => setWantsPromos(e.target.checked)}
          className="mt-1 rounded border-gray-300 text-[var(--color-brand-orange)] focus:ring-[var(--color-brand-orange)]"
        />
        <label htmlFor="promos" className="text-sm text-gray-600">
          Искам да получавам промоции и новини от FitFlow
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-brand-navy)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Зареждане...' : 'Регистрация'}
      </button>

      <div className="text-center text-sm text-gray-600">
        Вече имате акаунт?{' '}
        <Link href="/login" className="text-[var(--color-brand-orange)] hover:underline font-semibold">
          Вписване
        </Link>
      </div>
    </form>
  );
}
