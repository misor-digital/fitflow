/**
 * Site Configuration Page
 * Manages global site configuration settings
 * URL: /staff/catalog/config
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SiteConfig {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export default function SiteConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SiteConfig[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuthAndLoadConfig();
  }, []);

  const checkAuthAndLoadConfig = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch('/api/staff/catalog/config', {
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
        throw new Error('Failed to load config');
      }

      const data = await response.json();
      setConfig(data.config || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading config:', err);
      setError('Грешка при зареждане на конфигурацията');
      setLoading(false);
    }
  };

  const handleEdit = (item: SiteConfig) => {
    setEditingKey(item.key);
    setEditValue(item.value);
    setError('');
    setSuccess('');
  };

  const handleSave = async (key: string) => {
    setError('');
    setSuccess('');

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/catalog/config/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: editValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Грешка при запазване');
        return;
      }

      setSuccess('Конфигурацията е актуализирана успешно');
      setEditingKey(null);
      checkAuthAndLoadConfig();
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Грешка при запазване на конфигурацията');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
    setError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfigCategory = (key: string) => {
    if (key.startsWith('shipping_')) return 'Доставка';
    if (key.startsWith('payment_')) return 'Плащане';
    if (key.startsWith('email_')) return 'Имейл';
    if (key.startsWith('site_')) return 'Сайт';
    return 'Общи';
  };

  const groupedConfig = config.reduce((acc, item) => {
    const category = getConfigCategory(item.key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SiteConfig[]>);

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
          <div>
            <Link href="/staff/dashboard" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
              ← Назад към таблото
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Конфигурация на сайта</h1>
            <p className="text-sm text-gray-600">Управление на глобални настройки</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {/* Warning Box */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">Внимание</h3>
              <p className="text-sm text-yellow-800">
                Промените в конфигурацията се отразяват веднага на целия сайт. 
                Бъдете внимателни при редактиране на критични настройки.
              </p>
            </div>
          </div>
        </div>

        {/* Config Groups */}
        {Object.entries(groupedConfig).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Ключ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                      Стойност
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Актуализирано
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {item.key}
                      </td>
                      <td className="px-6 py-4">
                        {editingKey === item.key ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{item.value}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {editingKey === item.key ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSave(item.key)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Запази
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Отказ
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-purple-600 hover:text-purple-900 font-medium"
                          >
                            Редактирай
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Забележка:</strong> Конфигурационните настройки контролират глобалното поведение на сайта. 
            Всички промени се записват в одит логовете за проследяване.
          </p>
        </div>
      </main>
    </div>
  );
}
