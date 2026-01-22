/**
 * Create Promo Code Page
 * Form to create a new promo code
 * URL: /staff/promo-codes/new
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPromoCodePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [error, setError] = useState('');

  const checkAuth = useCallback(async () => {
    const sessionData = localStorage.getItem('supabase.auth.token');
    if (!sessionData) {
      router.push('/staff/login');
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Validate
      if (!code.trim() || !discountValue) {
        setError('Кодът и стойността на отстъпката са задължителни');
        setLoading(false);
        return;
      }

      const value = parseFloat(discountValue);
      if (isNaN(value) || value <= 0) {
        setError('Стойността на отстъпката трябва да бъде положително число');
        setLoading(false);
        return;
      }

      // Validate percentage range
      if (discountType === 'percentage' && (value < 0 || value > 100)) {
        setError('Процентната отстъпка трябва да бъде между 0 и 100');
        setLoading(false);
        return;
      }

      // Validate date range
      if (validFrom && validUntil) {
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        if (untilDate <= fromDate) {
          setError('Крайната дата трябва да бъде след началната дата');
          setLoading(false);
          return;
        }
      }

      // Create promo code
      const response = await fetch('/api/staff/promo-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: value,
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при създаване на промо кода');
        setLoading(false);
        return;
      }

      // Redirect to promo codes list
      router.push('/staff/promo-codes');
    } catch (err) {
      console.error('Error creating promo code:', err);
      setError('Грешка при създаване на промо кода');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800">
              Табло
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/staff/promo-codes" className="text-purple-600 hover:text-purple-800">
              Промо кодове
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Нов</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Нов промо код</h1>
          <p className="text-sm text-gray-600">Създайте нов промоционален код</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Code */}
            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Промо код *
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900 uppercase"
                placeholder="Напр: SUMMER2026"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Кодът трябва да бъде уникален и ще бъде автоматично преобразуван в главни букви
              </p>
            </div>

            {/* Discount Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип отстъпка *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Процент (%)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="fixed"
                    checked={discountType === 'fixed'}
                    onChange={(e) => setDiscountType(e.target.value as 'fixed')}
                    className="mr-2"
                  />
                  <span className="text-gray-900">Фиксирана сума (лв.)</span>
                </label>
              </div>
            </div>

            {/* Discount Value */}
            <div className="mb-6">
              <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-2">
                Стойност на отстъпката *
              </label>
              <input
                type="number"
                id="discountValue"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                {discountType === 'percentage' 
                  ? 'Въведете процент между 0 и 100' 
                  : 'Въведете фиксирана сума в лева'}
              </p>
            </div>

            {/* Valid From */}
            <div className="mb-6">
              <label htmlFor="validFrom" className="block text-sm font-medium text-gray-700 mb-2">
                Валиден от (опционално)
              </label>
              <input
                type="date"
                id="validFrom"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
              <p className="mt-2 text-sm text-gray-500">
                Ако не е зададено, кодът е валиден веднага
              </p>
            </div>

            {/* Valid Until */}
            <div className="mb-6">
              <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-2">
                Валиден до (опционално)
              </label>
              <input
                type="date"
                id="validUntil"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
              <p className="mt-2 text-sm text-gray-500">
                Ако не е зададено, кодът няма краен срок
              </p>
            </div>

            {/* Usage Limit */}
            <div className="mb-6">
              <label htmlFor="usageLimit" className="block text-sm font-medium text-gray-700 mb-2">
                Лимит на използване (опционално)
              </label>
              <input
                type="number"
                id="usageLimit"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="Напр: 100"
              />
              <p className="mt-2 text-sm text-gray-500">
                Максимален брой използвания на кода. Ако не е зададено, няма лимит
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Съвети за създаване на промо код</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Използвайте кратки и лесни за запомняне кодове</li>
                <li>• Избягвайте объркващи символи (0/O, 1/I/l)</li>
                <li>• Задайте краен срок за сезонни промоции</li>
                <li>• Ограничете използванията за ексклузивни оферти</li>
                <li>• Тествайте кода преди да го споделите с клиенти</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Създаване...' : 'Създай промо код'}
              </button>
              <Link
                href="/staff/promo-codes"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-center"
              >
                Отказ
              </Link>
            </div>
          </form>
        </div>

        {/* Examples */}
        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Примери за промо кодове</h2>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Сезонна промоция</h3>
              <p className="text-sm text-gray-600 mb-2">
                Код: <strong>SUMMER2026</strong> | Тип: Процент | Стойност: 15% | Валиден: 01.06 - 31.08
              </p>
              <p className="text-xs text-gray-500">
                Идеален за сезонни кампании с ограничен период
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Първа поръчка</h3>
              <p className="text-sm text-gray-600 mb-2">
                Код: <strong>WELCOME10</strong> | Тип: Фиксирана | Стойност: 10 лв. | Лимит: 500
              </p>
              <p className="text-xs text-gray-500">
                Подходящ за привличане на нови клиенти
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">VIP отстъпка</h3>
              <p className="text-sm text-gray-600 mb-2">
                Код: <strong>VIP20</strong> | Тип: Процент | Стойност: 20% | Без лимит
              </p>
              <p className="text-xs text-gray-500">
                За постоянни клиенти без ограничения
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
