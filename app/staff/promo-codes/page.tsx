/**
 * Staff Promo Codes Page
 * Lists all promo codes with management options
 * URL: /staff/promo-codes
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
}

export default function PromoCodesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const checkAuthAndLoadPromoCodes = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch('/api/staff/promo-codes', {
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
        throw new Error('Failed to load promo codes');
      }

      const data = await response.json();
      setPromoCodes(data.promoCodes || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading promo codes:', err);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadPromoCodes();
  }, [checkAuthAndLoadPromoCodes]);

  const handleToggle = async (id: string) => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/promo-codes/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Грешка при промяна на статуса');
        return;
      }

      checkAuthAndLoadPromoCodes();
    } catch (err) {
      console.error('Error toggling promo code:', err);
      alert('Грешка при промяна на статуса');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете промо код "${code}"?`)) {
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/promo-codes/${id}`, {
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

      checkAuthAndLoadPromoCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      alert('Грешка при изтриване');
    }
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `${value.toFixed(2)} лв.`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const filteredPromoCodes = promoCodes.filter(pc => {
    if (filter === 'active') return pc.is_active && !isExpired(pc.valid_until);
    if (filter === 'inactive') return !pc.is_active || isExpired(pc.valid_until);
    return true;
  });

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
              <h1 className="text-2xl font-bold text-gray-900">Промо кодове</h1>
              <p className="text-sm text-gray-600">Управление на промоционални кодове</p>
            </div>
            <Link
              href="/staff/promo-codes/new"
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
            >
              + Нов промо код
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Общо кодове</p>
            <p className="text-3xl font-bold text-gray-900">{promoCodes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Активни</p>
            <p className="text-3xl font-bold text-green-600">
              {promoCodes.filter(pc => pc.is_active && !isExpired(pc.valid_until)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Неактивни</p>
            <p className="text-3xl font-bold text-gray-500">
              {promoCodes.filter(pc => !pc.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Изтекли</p>
            <p className="text-3xl font-bold text-red-600">
              {promoCodes.filter(pc => isExpired(pc.valid_until)).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Всички ({promoCodes.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Активни ({promoCodes.filter(pc => pc.is_active && !isExpired(pc.valid_until)).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'inactive'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Неактивни/Изтекли ({promoCodes.filter(pc => !pc.is_active || isExpired(pc.valid_until)).length})
            </button>
          </div>
        </div>

        {/* Promo Codes List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredPromoCodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Няма промо кодове</p>
              <Link
                href="/staff/promo-codes/new"
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Създайте първия си промо код
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Код
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Отстъпка
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Използвания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Валидност
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPromoCodes.map((promoCode) => (
                    <tr key={promoCode.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-purple-600">
                          {promoCode.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {formatDiscount(promoCode.discount_type, promoCode.discount_value)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {promoCode.discount_type === 'percentage' ? 'Процент' : 'Фиксирана'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          {promoCode.usage_count} / {promoCode.usage_limit || '∞'}
                        </div>
                        {promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit && (
                          <span className="text-xs text-red-600">Изчерпан</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>{formatDate(promoCode.valid_from)} - {formatDate(promoCode.valid_until)}</div>
                        {isExpired(promoCode.valid_until) && (
                          <span className="text-xs text-red-600">Изтекъл</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {promoCode.is_active && !isExpired(promoCode.valid_until) ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Активен
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Неактивен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                        <Link
                          href={`/staff/promo-codes/${promoCode.id}/edit`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Редактирай
                        </Link>
                        <button
                          onClick={() => handleToggle(promoCode.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {promoCode.is_active ? 'Деактивирай' : 'Активирай'}
                        </button>
                        <button
                          onClick={() => handleDelete(promoCode.id, promoCode.code)}
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
      </main>
    </div>
  );
}
