/**
 * Staff Onboarding Page
 * First-time password setup for new staff users
 * URL: /staff/onboard?token=xxx
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function StaffOnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Невалиден линк за настройка');
      setLoading(false);
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Verify the magic link token
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token!,
        type: 'magiclink',
      });

      if (verifyError || !data.user) {
        setError('Невалиден или изтекъл линк за настройка');
        setLoading(false);
        return;
      }

      setEmail(data.user.email || '');
      setLoading(false);
    } catch (err) {
      setError('Грешка при проверка на линка');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate password
    if (password.length < 8) {
      setError('Паролата трябва да е поне 8 символа');
      setSaving(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат');
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError('Грешка при задаване на парола');
        setSaving(false);
        return;
      }

      // Update staff_users to clear requires_password_reset flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('staff_users')
          .update({ requires_password_reset: false })
          .eq('user_id', user.id);
      }

      // Redirect to dashboard
      router.push('/staff/dashboard');
    } catch (err) {
      setError('Грешка при задаване на парола');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Проверка на линка...</p>
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Грешка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/staff/login"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Към страницата за вход
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FitFlow</h1>
          <p className="text-purple-200">Добре дошъл/дошла в екипа! 🎉</p>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Задай парола
          </h2>
          <p className="text-gray-600 mb-6">
            {email}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Нова парола *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Поне 8 символа"
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Използвай поне 8 символа с комбинация от букви, цифри и специални знаци
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Потвърди паролата *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Въведи паролата отново"
                required
                minLength={8}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Запазване...' : 'Задай парола и влез'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Важно:</strong> След като зададеш парола, ще можеш да влезеш в системата с имейла и паролата си.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffOnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <StaffOnboardContent />
    </Suspense>
  );
}
