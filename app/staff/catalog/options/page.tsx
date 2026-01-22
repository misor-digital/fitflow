/**
 * Options Management Page
 * Manages all product options (sports, colors, flavors, dietary, sizes)
 * URL: /staff/catalog/options
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const OPTION_SETS = [
  { id: 'sports', name: 'Спортове', description: 'Видове спортове за персонализация' },
  { id: 'colors', name: 'Цветове', description: 'Налични цветове за продукти' },
  { id: 'flavors', name: 'Вкусове', description: 'Вкусове за хранителни добавки' },
  { id: 'dietary', name: 'Диетични', description: 'Диетични предпочитания' },
  { id: 'sizes', name: 'Размери', description: 'Размери за облекло' },
];

export default function OptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sports');
  const [options, setOptions] = useState<Option[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOption, setNewOption] = useState({ value: '', label: '', priceModifier: '0' });
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadOptions();
  }, [activeTab]);

  const checkAuthAndLoadOptions = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/options/${activeTab}`, {
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
        throw new Error('Failed to load options');
      }

      const data = await response.json();
      setOptions(data.options || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading options:', err);
      setError('Грешка при зареждане на опциите');
      setLoading(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);

      const priceModifier = parseFloat(newOption.priceModifier);
      if (isNaN(priceModifier)) {
        setError('Ценовият модификатор трябва да бъде число');
        return;
      }

      const response = await fetch(`/api/staff/catalog/options/${activeTab}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: newOption.value.trim(),
          label: newOption.label.trim(),
          priceModifier,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Грешка при добавяне на опция');
        return;
      }

      // Reset form and reload
      setNewOption({ value: '', label: '', priceModifier: '0' });
      setShowAddForm(false);
      checkAuthAndLoadOptions();
    } catch (err) {
      console.error('Error adding option:', err);
      setError('Грешка при добавяне на опция');
    }
  };

  const handleDeleteOption = async (id: string, label: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${label}"?`)) {
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/options/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Грешка при изтриване');
        return;
      }

      checkAuthAndLoadOptions();
    } catch (err) {
      console.error('Error deleting option:', err);
      alert('Грешка при изтриване');
    }
  };

  const formatPrice = (modifier: number) => {
    if (modifier === 0) return '—';
    return modifier > 0 ? `+${modifier.toFixed(2)} лв.` : `${modifier.toFixed(2)} лв.`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
                ← Назад към таблото
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Опции за продукти</h1>
              <p className="text-sm text-gray-600">Управление на опции за персонализация</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {OPTION_SETS.map((set) => (
                <button
                  key={set.id}
                  onClick={() => {
                    setActiveTab(set.id);
                    setShowAddForm(false);
                    setError('');
                  }}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === set.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {set.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {OPTION_SETS.find(s => s.id === activeTab)?.name}
                </h2>
                <p className="text-sm text-gray-600">
                  {OPTION_SETS.find(s => s.id === activeTab)?.description}
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
              >
                {showAddForm ? 'Отказ' : '+ Добави опция'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Add Form */}
            {showAddForm && (
              <form onSubmit={handleAddOption} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Стойност (value) *
                    </label>
                    <input
                      type="text"
                      value={newOption.value}
                      onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="напр: football"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Етикет (label) *
                    </label>
                    <input
                      type="text"
                      value={newOption.label}
                      onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="напр: Футбол"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ценови модификатор (лв.)
                    </label>
                    <input
                      type="number"
                      value={newOption.priceModifier}
                      onChange={(e) => setNewOption({ ...newOption, priceModifier: e.target.value })}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    Добави
                  </button>
                </div>
              </form>
            )}

            {/* Options List */}
            {options.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Няма добавени опции за тази категория
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Стойност
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Етикет
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ценови модификатор
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {options.map((option) => (
                      <tr key={option.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {option.value}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {option.label}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatPrice(option.price_modifier)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <button
                            onClick={() => handleDeleteOption(option.id, option.label)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Изтрий
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Забележка:</strong> Опциите се използват за персонализация на продуктите. 
            Ценовият модификатор се добавя към базовата цена на продукта.
          </p>
        </div>
      </main>
    </div>
  );
}
