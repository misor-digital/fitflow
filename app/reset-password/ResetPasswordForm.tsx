'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { validatePassword } from '@/lib/auth/passwordPolicy';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordValidation = validatePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError('Грешка при нулиране на паролата. Опитайте отново.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to home after a short delay
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
        <p className="font-semibold mb-2">Паролата е променена!</p>
        <p className="text-sm">Пренасочване...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Нова парола
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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-brand-navy)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Зареждане...' : 'Запази новата парола'}
      </button>
    </form>
  );
}
