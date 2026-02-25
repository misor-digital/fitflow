'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError('Грешка при изпращане на линк. Опитайте отново.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
        <p className="font-semibold mb-2">Линкът е изпратен!</p>
        <p className="text-sm">
          Проверете имейла си ({email}) за линк за нулиране на паролата.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-[var(--color-brand-orange)] hover:underline">
          Обратно към вход
        </Link>
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

      <p className="text-sm text-gray-600">
        Въведете имейл адреса, с който сте се регистрирали. Ще ви изпратим линк за нулиране на паролата.
      </p>

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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-brand-navy)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Зареждане...' : 'Изпрати линк'}
      </button>

      <div className="text-center text-sm">
        <Link href="/login" className="text-gray-500 hover:underline">
          Обратно към вход
        </Link>
      </div>
    </form>
  );
}
