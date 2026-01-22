/**
 * Create Box Type Page
 * Form to create a new box type
 * URL: /staff/catalog/box-types/new
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewBoxTypePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const sessionData = localStorage.getItem('supabase.auth.token');
    if (!sessionData) {
      router.push('/staff/login');
    }
  };

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
      if (!name.trim() || !description.trim() || !basePrice) {
        setError('Всички полета са задължителни');
        setLoading(false);
        return;
      }

      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        setError('Базовата цена трябва да бъде положително число');
        setLoading(false);
        return;
      }

      // Create box type
      const response = await fetch('/api/staff/catalog/box-types', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          basePrice: price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при създаване на типа кутия');
        setLoading(false);
        return;
      }

      // Redirect to box types list
      router.push('/staff/catalog/box-types');
    } catch (err) {
      console.error('Error creating box type:', err);
      setError('Грешка при създаване на типа кутия');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/staff/catalog/box-types" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към типовете кутии
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Нов тип кутия</h1>
          <p className="text-sm text-gray-600">Създайте нов продуктов тип</p>
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

            {/* Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Име на типа *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Напр: Стандартна кутия"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Описание *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Опишете типа кутия..."
                required
              />
            </div>

            {/* Base Price */}
            <div className="mb-6">
              <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Базова цена (лв.) *
              </label>
              <input
                type="number"
                id="basePrice"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="0.00"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Базовата цена може да бъде модифицирана с опции (спорт, размер, и т.н.)
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Съвети</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Изберете ясно и описателно име</li>
                <li>• Опишете какво включва този тип кутия</li>
                <li>• Базовата цена е стартовата цена преди добавяне на опции</li>
                <li>• След създаване можете да добавите опции за персонализация</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Създаване...' : 'Създай тип кутия'}
              </button>
              <Link
                href="/staff/catalog/box-types"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-center"
              >
                Отказ
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
