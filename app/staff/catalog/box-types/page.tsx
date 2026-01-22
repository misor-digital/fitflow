/**
 * Box Types Management Page
 * Lists and manages all box types
 * URL: /staff/catalog/box-types
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BoxType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function BoxTypesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadBoxTypes();
  }, []);

  const checkAuthAndLoadBoxTypes = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch('/api/staff/catalog/box-types', {
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
        throw new Error('Failed to load box types');
      }

      const data = await response.json();
      setBoxTypes(data.boxTypes || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading box types:', err);
      setError('Грешка при зареждане на типовете кутии');
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/box-types/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Грешка при промяна на статуса');
        return;
      }

      // Reload box types
      checkAuthAndLoadBoxTypes();
    } catch (err) {
      console.error('Error toggling box type:', err);
      alert('Грешка при промяна на статуса');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${name}"?`)) {
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/box-types/${id}`, {
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

      // Reload box types
      checkAuthAndLoadBoxTypes();
    } catch (err) {
      console.error('Error deleting box type:', err);
      alert('Грешка при изтриване');
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} лв.`;
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
              <h1 className="text-2xl font-bold text-gray-900">Типове кутии</h1>
              <p className="text-sm text-gray-600">Управление на продуктови типове</p>
            </div>
            <Link
              href="/staff/catalog/box-types/new"
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
            >
              + Нов тип кутия
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Общо типове</p>
            <p className="text-3xl font-bold text-gray-900">{boxTypes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Активни</p>
            <p className="text-3xl font-bold text-green-600">
              {boxTypes.filter(bt => bt.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Неактивни</p>
            <p className="text-3xl font-bold text-gray-500">
              {boxTypes.filter(bt => !bt.is_active).length}
            </p>
          </div>
        </div>

        {/* Box Types List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {boxTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Няма създадени типове кутии</p>
              <Link
                href="/staff/catalog/box-types/new"
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Създайте първия тип кутия
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Име
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Базова цена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {boxTypes.map((boxType) => (
                    <tr key={boxType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/staff/catalog/box-types/${boxType.id}/edit`}
                          className="text-purple-600 hover:text-purple-800 font-medium"
                        >
                          {boxType.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {boxType.description}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatPrice(boxType.base_price)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          boxType.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {boxType.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                        <Link
                          href={`/staff/catalog/box-types/${boxType.id}/edit`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Редактирай
                        </Link>
                        <button
                          onClick={() => handleToggle(boxType.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {boxType.is_active ? 'Деактивирай' : 'Активирай'}
                        </button>
                        <button
                          onClick={() => handleDelete(boxType.id, boxType.name)}
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

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Забележка:</strong> Типовете кутии определят основните продукти, които клиентите могат да поръчат. 
            Базовата цена може да бъде модифицирана с опции (спорт, размер, и т.н.).
          </p>
        </div>
      </main>
    </div>
  );
}
