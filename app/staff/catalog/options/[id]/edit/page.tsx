/**
 * Edit Option Page
 * Form to edit an existing product option
 * URL: /staff/catalog/options/[id]/edit
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Option {
  id: string;
  set_id: string;
  value: string;
  label: string;
  price_modifier: number;
  is_active: boolean;
  sort_order: number;
}

const OPTION_SET_NAMES: Record<string, string> = {
  sports: 'Спортове',
  colors: 'Цветове',
  flavors: 'Вкусове',
  dietary: 'Диетични',
  sizes: 'Размери',
};

export default function EditOptionPage() {
  const router = useRouter();
  const params = useParams();
  const optionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [option, setOption] = useState<Option | null>(null);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [priceModifier, setPriceModifier] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadOption();
  }, [optionId]);

  const checkAuthAndLoadOption = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Fetch option details - we need to get it from the list endpoint
      // since there's no GET endpoint for single option
      const response = await fetch(`/api/staff/catalog/options/sets/sports`, {
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
        throw new Error('Failed to load option');
      }

      const data = await response.json();
      
      // Try to find the option in all sets
      let foundOption: Option | null = null;
      const sets = ['sports', 'colors', 'flavors', 'dietary', 'sizes'];
      
      for (const setId of sets) {
        const setResponse = await fetch(`/api/staff/catalog/options/sets/${setId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (setResponse.ok) {
          const setData = await setResponse.json();
          const opt = setData.options?.find((o: Option) => o.id === optionId);
          if (opt) {
            foundOption = opt;
            break;
          }
        }
      }

      if (!foundOption) {
        setError('Опцията не е намерена');
        setLoading(false);
        return;
      }

      setOption(foundOption);
      setValue(foundOption.value);
      setLabel(foundOption.label);
      setPriceModifier(foundOption.price_modifier.toString());
      setLoading(false);
    } catch (err) {
      console.error('Error loading option:', err);
      setError('Грешка при зареждане на опцията');
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
      if (!value.trim() || !label.trim()) {
        setError('Стойността и етикетът са задължителни');
        setSaving(false);
        return;
      }

      const price = parseFloat(priceModifier);
      if (isNaN(price)) {
        setError('Ценовият модификатор трябва да бъде число');
        setSaving(false);
        return;
      }

      // Update option
      const response = await fetch(`/api/staff/catalog/options/${optionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: value.trim(),
          label: label.trim(),
          priceModifier: price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при актуализиране на опцията');
        setSaving(false);
        return;
      }

      // Redirect to options list
      router.push('/staff/catalog/options');
    } catch (err) {
      console.error('Error updating option:', err);
      setError('Грешка при актуализиране на опцията');
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

  if (!option) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Опцията не е намерена'}</p>
          <Link href="/staff/catalog/options" className="text-purple-600 hover:text-purple-800">
            Назад към опциите
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
          <Link href="/staff/catalog/options" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към опциите
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактиране на опция</h1>
          <p className="text-sm text-gray-600">
            {OPTION_SET_NAMES[option.set_id] || option.set_id} - {option.label}
          </p>
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

            {/* Category Badge */}
            <div className="mb-6">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {OPTION_SET_NAMES[option.set_id] || option.set_id}
              </span>
            </div>

            {/* Value */}
            <div className="mb-6">
              <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
                Стойност (value) *
              </label>
              <input
                type="text"
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent font-mono"
                placeholder="напр: football"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Техническата стойност, използвана в системата (обикновено на английски)
              </p>
            </div>

            {/* Label */}
            <div className="mb-6">
              <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-2">
                Етикет (label) *
              </label>
              <input
                type="text"
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="напр: Футбол"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Видимото име, което потребителите виждат
              </p>
            </div>

            {/* Price Modifier */}
            <div className="mb-6">
              <label htmlFor="priceModifier" className="block text-sm font-medium text-gray-700 mb-2">
                Ценови модификатор (лв.)
              </label>
              <input
                type="number"
                id="priceModifier"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-2 text-sm text-gray-500">
                Сума, която се добавя (+) или изважда (-) от базовата цена. Използвай 0 за без промяна.
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
                href="/staff/catalog/options"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-center"
              >
                Отказ
              </Link>
            </div>
          </form>
        </div>

        {/* Examples */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Примери за ценови модификатори</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Стандартна опция (без промяна)</span>
              <span className="font-mono font-bold text-gray-900">0.00 лв.</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-700">Премиум опция (добавя към цената)</span>
              <span className="font-mono font-bold text-green-700">+5.00 лв.</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="text-gray-700">Промоционална опция (намалява цената)</span>
              <span className="font-mono font-bold text-red-700">-3.00 лв.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
