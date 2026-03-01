'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { validatePassword } from '@/lib/auth/passwordPolicy';
import PasswordInput from '@/components/PasswordInput';
import { useAuthStore } from '@/store/authStore';

export default function SetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  const validation = validatePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validation.isValid) {
      setError('Паролата не отговаря на изискванията');
      return;
    }
    if (password !== confirm) {
      setError('Паролите не съвпадат');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('Грешка при задаване на парола. Опитайте отново.');
      setLoading(false);
      return;
    }

    // Mark password as set in metadata for has-password detection
    await supabase.auth.updateUser({
      data: { has_password: true },
    });

    // Redirect based on user type
    if (user?.userType === 'staff') {
      router.push('/admin');
    } else {
      router.push('/');
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Нова парола
        </label>
        <PasswordInput
          id="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          required minLength={8}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
        {/* Password policy checklist */}
        {password.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {validation.errors.map((err, i) => (
              <li key={i} className="text-red-500">✗ {err}</li>
            ))}
            {validation.isValid && (
              <li className="text-green-600">✓ Паролата отговаря на изискванията</li>
            )}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
          Потвърдете паролата
        </label>
        <PasswordInput
          id="confirm" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required minLength={8}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:outline-none"
        />
      </div>

      <button
        type="submit" disabled={loading || !validation.isValid}
        className="w-full bg-[var(--color-brand-navy)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Запазване...' : 'Задай парола'}
      </button>

      {user?.userType !== 'staff' && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              if (user?.userType === 'staff') {
                router.push('/admin');
              } else {
                router.push('/');
              }
              router.refresh();
            }}
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            Пропусни засега
          </button>
        </div>
      )}
    </form>
  );
}
