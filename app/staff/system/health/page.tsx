/**
 * System Health Dashboard
 * Display system status and database statistics
 * URL: /staff/system/health
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: {
    connected: boolean;
    responseTime: number;
  };
  tables: {
    [key: string]: number;
  };
  timestamp: string;
}

interface DatabaseStats {
  tables: Array<{
    name: string;
    rowCount: number;
  }>;
  totalRecords: number;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Load system health
      const healthResponse = await fetch('/api/staff/system/health', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!healthResponse.ok) {
        if (healthResponse.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load system health');
      }

      const healthData = await healthResponse.json();
      setHealth(healthData.health);

      // Load database stats
      const statsResponse = await fetch('/api/staff/system/database', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error loading system health:', err);
      setError('Грешка при зареждане на данните');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      checkAuthAndLoadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkAuthAndLoadData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Здрава';
      case 'degraded':
        return 'Влошена';
      case 'down':
        return 'Неактивна';
      default:
        return 'Неизвестна';
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
            <span className="text-gray-600">Здраве на системата</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Здраве на системата</h1>
              <p className="text-sm text-gray-600">Мониторинг на системата и базата данни</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/staff/audit-logs"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
              >
                📋 Одит логове
              </Link>
              <button
                onClick={() => checkAuthAndLoadData()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
              >
                🔄 Обнови
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* System Status */}
        {health && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className={`w-24 h-24 rounded-full ${getStatusColor(health.status)} flex items-center justify-center`}>
                  <span className="text-4xl text-white">
                    {health.status === 'healthy' ? '✓' : health.status === 'degraded' ? '⚠' : '✗'}
                  </span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Системата е {getStatusText(health.status)}
              </h2>
              <p className="text-gray-600">
                Последна актуализация: {lastUpdated.toLocaleString('bg-BG')}
              </p>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Database Connection */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Връзка с базата данни</p>
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${health.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <p className="text-2xl font-bold text-gray-900">
                  {health.database.connected ? 'Свързана' : 'Несвързана'}
                </p>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Време за отговор</p>
              <p className="text-2xl font-bold text-gray-900">
                {health.database.responseTime}ms
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {health.database.responseTime < 500 ? 'Отлично' : health.database.responseTime < 1000 ? 'Добро' : 'Бавно'}
              </p>
            </div>

            {/* Total Records */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-2">Общо записи</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalRecords.toLocaleString('bg-BG')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Във всички таблици
                </p>
              </div>
            )}
          </div>
        )}

        {/* Database Statistics */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика на базата данни</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Таблица
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Брой записи
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Процент
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.tables.map((table, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {table.rowCount.toLocaleString('bg-BG')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${(table.rowCount / stats.totalRecords) * 100}%` }}
                            ></div>
                          </div>
                          <span>{((table.rowCount / stats.totalRecords) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Информация</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Страницата се обновява автоматично на всеки 30 секунди</li>
            <li>• Здрава система: време за отговор {'<'} 1000ms</li>
            <li>• Влошена система: време за отговор {'>'} 1000ms</li>
            <li>• Неактивна система: няма връзка с базата данни</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
