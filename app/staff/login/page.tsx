/**
 * Staff Login Page
 * Email + password authentication for staff users
 * URL: /staff/login
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          'Invalid email or password': 'Невалиден имейл или парола',
          'Access denied: Not a staff user': 'Нямате достъп до служебната система',
          'Account is disabled': 'Вашият акаунт е деактивиран',
        };
        setError(errorMessages[data.error] || 'Грешка при влизане');
        setLoading(false);
        return;
      }

      // Store session
      if (data.session) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      }

      // Check if password reset is required
      if (data.requiresPasswordReset) {
        router.push('/staff/reset-password');
        return;
      }

      // Successful login - redirect to dashboard
      router.push('/staff/dashboard');
    } catch {
      setError('Грешка при влизане');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FitFlow</h1>
          <p className="text-purple-200">Вътрешна система</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Вход за служители</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имейл адрес
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="your.email@fitflow.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Парола
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? 'Скрий парола' : 'Покажи парола'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a
                href="/staff/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Забравена парола?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Влизане...' : 'Влез'}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              🔒 Защитена връзка. Всички действия се записват в одит лога.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-purple-200 hover:text-white text-sm transition"
          >
            ← Към началната страница
          </Link>
        </div>
      </div>
    </div>
  );
}
