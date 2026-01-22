/**
 * Staff Campaigns Page
 * Lists all newsletter campaigns with filtering and pagination
 * URL: /staff/campaigns
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  subject: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  sent_at: string | null;
  created_at: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const checkAuthAndLoadCampaigns = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Fetch campaigns
      const response = await fetch(`/api/staff/campaigns?page=${page}&limit=20`, {
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
        throw new Error('Failed to load campaigns');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    checkAuthAndLoadCampaigns();
  }, [checkAuthAndLoadCampaigns]);

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази кампания?')) {
      return;
    }

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Грешка при изтриване на кампанията');
        return;
      }

      // Reload campaigns
      checkAuthAndLoadCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Грешка при изтриване на кампанията');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sending: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      draft: 'Чернова',
      sending: 'Изпраща се',
      sent: 'Изпратена',
      failed: 'Неуспешна',
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
              <h1 className="text-2xl font-bold text-gray-900">Имейл кампании</h1>
              <p className="text-sm text-gray-600">Управление на newsletter кампании</p>
            </div>
            <Link
              href="/staff/campaigns/new"
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-900 transition"
            >
              + Нова кампания
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Общо кампании</p>
            <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Чернови</p>
            <p className="text-3xl font-bold text-gray-500">
              {campaigns.filter(c => c.status === 'draft').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Изпратени</p>
            <p className="text-3xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'sent').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Неуспешни</p>
            <p className="text-3xl font-bold text-red-600">
              {campaigns.filter(c => c.status === 'failed').length}
            </p>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Няма създадени кампании</p>
              <Link
                href="/staff/campaigns/new"
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Създайте първата си кампания
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тема
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Получатели
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Изпратена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Създадена
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/staff/campaigns/${campaign.id}`}
                          className="text-purple-600 hover:text-purple-800 font-medium"
                        >
                          {campaign.subject}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {campaign.status === 'sent' ? (
                          <div>
                            <div className="font-medium">{campaign.total_recipients}</div>
                            <div className="text-xs text-gray-500">
                              ✓ {campaign.successful_sends} / ✗ {campaign.failed_sends}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {campaign.sent_at ? formatDate(campaign.sent_at) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(campaign.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/staff/campaigns/${campaign.id}`}
                          className="text-purple-600 hover:text-purple-900 mr-4"
                        >
                          Преглед
                        </Link>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Изтрий
                          </button>
                        )}
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
      </main>
    </div>
  );
}
