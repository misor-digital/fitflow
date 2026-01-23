/**
 * Audit Log Viewer
 * Display and filter audit logs
 * URL: /staff/audit-logs
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  
  // Filters
  const [actorType, setActorType] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (actorType) params.append('actorType', actorType);
      if (action) params.append('action', action);
      if (resourceType) params.append('resourceType', resourceType);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      // Load audit logs
      const response = await fetch(`/api/staff/audit-logs?${params.toString()}`, {
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
        throw new Error('Failed to load audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setLoading(false);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Грешка при зареждане на данните');
      setLoading(false);
    }
  }, [router, page, actorType, action, resourceType, fromDate, toDate]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      checkAuthAndLoadData();
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);

      const params = new URLSearchParams();
      params.append('q', searchQuery);
      if (actorType) params.append('actorType', actorType);
      if (resourceType) params.append('resourceType', resourceType);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const response = await fetch(`/api/staff/audit-logs/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.logs.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error searching audit logs:', err);
    }
  };

  const handleExport = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);

      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (actorType) params.append('actorType', actorType);
      if (action) params.append('action', action);
      if (resourceType) params.append('resourceType', resourceType);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const response = await fetch(`/api/staff/audit-logs/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting audit logs:', err);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActorTypeBadge = (type: string) => {
    switch (type) {
      case 'staff':
        return 'bg-purple-100 text-purple-800';
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            <span className="text-gray-600">Одитни логове</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Одитни логове</h1>
              <p className="text-sm text-gray-600">Преглед на системните действия</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/staff/system/health"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
              >
                ⚙️ Здраве на системата
              </Link>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                📥 Експорт CSV
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Филтри</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Actor Type */}
            <div>
              <label htmlFor="actorType" className="block text-sm font-medium text-gray-700 mb-2">
                Тип актьор
              </label>
              <select
                id="actorType"
                value={actorType}
                onChange={(e) => setActorType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              >
                <option value="">Всички</option>
                <option value="staff">Персонал</option>
                <option value="customer">Клиент</option>
                <option value="system">Система</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-2">
                Действие
              </label>
              <input
                type="text"
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="Напр: create, update"
              />
            </div>

            {/* Resource Type */}
            <div>
              <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700 mb-2">
                Тип ресурс
              </label>
              <input
                type="text"
                id="resourceType"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                placeholder="Напр: promo_code"
              />
            </div>

            {/* From Date */}
            <div>
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-2">
                От дата
              </label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
            </div>

            {/* To Date */}
            <div>
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-2">
                До дата
              </label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
              placeholder="Търсене по имейл, действие или ID..."
            />
            <button
              onClick={handleSearch}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              🔍 Търси
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setActorType('');
                setAction('');
                setResourceType('');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Изчисти
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Резултати ({total})
            </h2>
          </div>

          {logs.length === 0 ? (
            <p className="text-center text-gray-600 py-8">Няма намерени логове</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Време
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Актьор
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действие
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ресурс
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Детайли
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <>
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActorTypeBadge(log.actor_type)}`}>
                                {log.actor_type}
                              </span>
                              <p className="text-sm text-gray-900 mt-1">{log.actor_email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-gray-900">{log.resource_type}</p>
                            <p className="text-xs text-gray-500">{log.resource_id}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => toggleRow(log.id)}
                              className="text-purple-600 hover:text-purple-800"
                            >
                              {expandedRows.has(log.id) ? '▼ Скрий' : '▶ Покажи'}
                            </button>
                          </td>
                        </tr>
                        {expandedRows.has(log.id) && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">
                              <div className="text-sm">
                                <p className="font-semibold text-gray-900 mb-2">Метаданни:</p>
                                <pre className="bg-white p-4 rounded border border-gray-200 overflow-x-auto text-xs">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Предишна
                  </button>
                  <span className="text-sm text-gray-600">
                    Страница {page} от {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Следваща →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
