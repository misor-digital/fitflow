/**
 * Staff Subscribers Page
 * Lists all newsletter subscribers with filtering, search, and export
 * URL: /staff/subscribers
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subscriber {
  id: string;
  email: string;
  status: 'pending' | 'subscribed' | 'unsubscribed';
  source: string;
  confirmed_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  subscribed: number;
  pending: number;
  unsubscribed: number;
  growthRate: number;
  bySource: Array<{ source: string; count: number }>;
}

export default function SubscribersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'subscribed' | 'unsubscribed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [page, statusFilter]);

  const checkAuthAndLoadData = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Fetch subscribers
      const subscribersResponse = await fetch(
        `/api/staff/subscribers?page=${page}&limit=20&status=${statusFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!subscribersResponse.ok) {
        if (subscribersResponse.status === 401) {
          localStorage.removeItem('supabase.auth.token');
          router.push('/staff/login');
          return;
        }
        throw new Error('Failed to load subscribers');
      }

      const subscribersData = await subscribersResponse.json();
      setSubscribers(subscribersData.subscribers || []);
      setTotal(subscribersData.total || 0);
      setTotalPages(subscribersData.totalPages || 1);

      // Fetch stats
      const statsResponse = await fetch('/api/staff/subscribers/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading subscribers:', err);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      checkAuthAndLoadData();
      return;
    }

    setSearching(true);

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(
        `/api/staff/subscribers/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
        setTotal(data.subscribers?.length || 0);
        setTotalPages(1);
      }

      setSearching(false);
    } catch (err) {
      console.error('Error searching subscribers:', err);
      setSearching(false);
    }
  };

  const handleExport = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(
        `/api/staff/subscribers/export?status=${statusFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        alert('Грешка при експортиране на абонатите');
        return;
      }

      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting subscribers:', err);
      alert('Грешка при експортиране на абонатите');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      subscribed: 'bg-green-100 text-green-800',
      unsubscribed: 'bg-gray-100 text-gray-800',
    };
    
    const labels = {
      pending: 'Чакащ',
      subscribed: 'Абониран',
      unsubscribed: 'Отписан',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
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
              <h1 className="text-2xl font-bold text-gray-900">Абонати на бюлетина</h1>
              <p className="text-sm text-gray-600">Управление на newsletter абонати</p>
            </div>
            <button
              onClick={handleExport}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              📥 Експорт CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Общо абонати</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Абонирани</p>
              <p className="text-3xl font-bold text-green-600">{stats.subscribed}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Чакащи</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Растеж (30 дни)</p>
              <p className={`text-3xl font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growthRate > 0 ? '+' : ''}{stats.growthRate}%
              </p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Филтър по статус
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'pending' | 'subscribed' | 'unsubscribed');
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="all">Всички</option>
                <option value="subscribed">Абонирани</option>
                <option value="pending">Чакащи</option>
                <option value="unsubscribed">Отписани</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Търсене по имейл
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Въведете имейл..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {searching ? '...' : '🔍'}
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      checkAuthAndLoadData();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscribers List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {subscribers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Няма намерени абонати</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Имейл
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Източник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Потвърден
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Създаден
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {subscriber.email}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(subscriber.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {subscriber.source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {subscriber.confirmed_at ? formatDate(subscriber.confirmed_at) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(subscriber.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Предишна
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Следваща
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Страница <span className="font-medium">{page}</span> от{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Source Breakdown */}
        {stats && stats.bySource.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Абонати по източник</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.bySource.map((item) => (
                <div key={item.source} className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">{item.source}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
