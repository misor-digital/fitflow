/**
 * Campaign Statistics Page
 * Detailed analytics for a sent campaign
 * URL: /staff/campaigns/[id]/stats
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface CampaignStats {
  campaign_id: string;
  campaign_subject: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  sent_at: string;
  success_rate: number;
  avg_send_time_ms: number;
}

export default function CampaignStatsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadStats();
  }, [campaignId]);

  const checkAuthAndLoadStats = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/campaigns/${campaignId}/stats`, {
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
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setLoading(false);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Грешка при зареждане на статистиката');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('bg-BG', {
      year: 'numeric',
      month: 'long',
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

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Статистиката не е намерена'}</p>
          <Link href={`/staff/campaigns/${campaignId}`} className="text-purple-600 hover:text-purple-800">
            ← Назад към кампанията
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
          <Link href={`/staff/campaigns/${campaignId}`} className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към кампанията
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Статистика на кампанията</h1>
              <p className="text-sm text-gray-600 mt-1">{stats.campaign_subject}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Общо получатели</p>
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_recipients}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Успешно изпратени</p>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.successful_sends}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.success_rate.toFixed(1)}% успеваемост
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Неуспешни</p>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.failed_sends}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(100 - stats.success_rate).toFixed(1)}% неуспех
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Средно време</p>
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {stats.avg_send_time_ms < 1000 
                ? `${stats.avg_send_time_ms}ms`
                : `${(stats.avg_send_time_ms / 1000).toFixed(2)}s`
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">на имейл</p>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Campaign Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация за кампанията</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Тема</dt>
                <dd className="mt-1 text-sm text-gray-900">{stats.campaign_subject}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Изпратена на</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(stats.sent_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID на кампанията</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{stats.campaign_id}</dd>
              </div>
            </dl>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Показатели за ефективност</h2>
            <div className="space-y-4">
              {/* Success Rate Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Процент успех</span>
                  <span className="text-sm font-bold text-gray-900">{stats.success_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${stats.success_rate}%` }}
                  ></div>
                </div>
              </div>

              {/* Failure Rate Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Процент неуспех</span>
                  <span className="text-sm font-bold text-gray-900">{(100 - stats.success_rate).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all"
                    style={{ width: `${100 - stats.success_rate}%` }}
                  ></div>
                </div>
              </div>

              {/* Performance Rating */}
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Оценка на ефективността
                </p>
                <p className="text-sm text-gray-700">
                  {stats.success_rate >= 95 && '🌟 Отлично! Кампанията е изключително успешна.'}
                  {stats.success_rate >= 85 && stats.success_rate < 95 && '✅ Много добре! Кампанията е успешна.'}
                  {stats.success_rate >= 70 && stats.success_rate < 85 && '👍 Добре. Има място за подобрение.'}
                  {stats.success_rate < 70 && '⚠️ Внимание! Проверете настройките за имейл.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights & Recommendations */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Анализ и препоръки</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Положителни аспекти</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {stats.success_rate >= 90 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Отличен процент на доставка ({stats.success_rate.toFixed(1)}%)</span>
                  </li>
                )}
                {stats.total_recipients >= 100 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Голям обхват - {stats.total_recipients} получатели</span>
                  </li>
                )}
                {stats.avg_send_time_ms < 2000 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Бързо време за изпращане</span>
                  </li>
                )}
                {stats.failed_sends === 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Няма неуспешни изпращания</span>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Препоръки за подобрение</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {stats.failed_sends > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600">→</span>
                    <span>Проверете валидността на имейл адресите с неуспешни изпращания</span>
                  </li>
                )}
                {stats.success_rate < 90 && (
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600">→</span>
                    <span>Разгледайте настройките на SMTP сървъра</span>
                  </li>
                )}
                {stats.total_recipients < 50 && (
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600">→</span>
                    <span>Увеличете базата от абонати за по-голям обхват</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">💡</span>
                  <span>Следете метриките за отваряне и кликвания в бъдещи кампании</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/staff/campaigns/${campaignId}`}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg hover:from-purple-700 hover:to-purple-900 transition font-semibold"
          >
            ← Назад към кампанията
          </Link>
          <Link
            href="/staff/campaigns"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-semibold"
          >
            Всички кампании
          </Link>
        </div>
      </main>
    </div>
  );
}
