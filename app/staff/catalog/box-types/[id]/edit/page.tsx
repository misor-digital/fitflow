/**
 * Edit Box Type Page
 * Form to edit an existing box type
 * URL: /staff/catalog/box-types/[id]/edit
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface BoxType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  is_active: boolean;
}

export default function EditBoxTypePage() {
  const router = useRouter();
  const params = useParams();
  const boxTypeId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boxType, setBoxType] = useState<BoxType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadBoxType();
  }, [boxTypeId]);

  const checkAuthAndLoadBoxType = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/box-types/${boxTypeId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load box type');
      }

      const data = await response.json();
      const bt = data.boxType;
      
      setBoxType(bt);
      setName(bt.name);
      setDescription(bt.description);
      setBasePrice(bt.base_price.toString());
      setLoading(false);
    } catch (err) {
      console.error('Error loading box type:', err);
      setError('Грешка при зареждане на типа кутия');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

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
        setSaving(false);
        return;
      }

      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        setError('Базовата цена трябва да бъде положително число');
        setSaving(false);
        return;
      }

      // Update box type
      const response = await fetch(`/api/staff/catalog/box-types/${boxTypeId}`, {
        method: 'PUT',
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
        setError(data.error || 'Грешка при актуализиране на типа кутия');
        setSaving(false);
        return;
      }

      // Redirect to box types list
      router.push('/staff/catalog/box-types');
    } catch (err) {
      console.error('Error updating box type:', err);
      setError('Грешка при актуализиране на типа кутия');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (!boxType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Типът кутия не е намерен</p>
          <Link href="/staff/catalog/box-types" className="text-purple-600 hover:text-purple-800">
            Назад към типовете кутии
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/staff/catalog/box-types" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към типовете кутии
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактиране на тип кутия</h1>
          <p className="text-sm text-gray-600">{boxType.name}</p>
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

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                boxType.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {boxType.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </div>

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
              <p className="text-sm text-blue-800">
                <strong>Забележка:</strong> Промените ще се отразят веднага на всички нови поръчки. 
                Съществуващите поръчки няма да бъдат засегнати.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Запазване...' : 'Запази промените'}
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
