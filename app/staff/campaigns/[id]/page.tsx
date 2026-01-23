/**
 * Campaign Details Page
 * View campaign details and send to subscribers
 * URL: /staff/campaigns/[id]
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  subject: string;
  html_content: string;
  text_content: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const loadCampaign = async () => {
    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) {
        router.push('/staff/login');
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Fetch campaign
      const response = await fetch(`/api/staff/campaigns/${campaignId}`, {
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
        throw new Error('Failed to load campaign');
      }

      const data = await response.json();
      setCampaign(data.campaign);
      setLoading(false);
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError('Грешка при зареждане на кампанията');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [campaignId, router]);

  const handleSend = async () => {
    if (!confirm('Сигурни ли сте, че искате да изпратите тази кампания до всички абонати?')) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const sessionData = localStorage.getItem('supabase.auth.token');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      const response = await fetch(`/api/staff/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Грешка при изпращане на кампанията');
        setSending(false);
        return;
      }

      // Reload campaign
      await loadCampaign();
      setSending(false);
      alert(`Кампанията е изпратена успешно до ${data.totalRecipients} абонати!`);
    } catch (err) {
      console.error('Error sending campaign:', err);
      setError('Грешка при изпращане на кампанията');
      setSending(false);
    }
  };

  const handleDelete = async () => {
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

      router.push('/staff/campaigns');
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
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
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

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Кампанията не е намерена</p>
          <Link href="/staff/campaigns" className="text-purple-600 hover:text-purple-800">
            Назад към кампаниите
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
          <Link href="/staff/campaigns" className="text-purple-600 hover:text-purple-800 text-sm mb-2 inline-block">
            ← Назад към кампаниите
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.subject}</h1>
              <p className="text-sm text-gray-600 mt-1">ID: {campaign.id}</p>
            </div>
            <div>
              {getStatusBadge(campaign.status)}
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

        {/* Stats */}
        {campaign.status === 'sent' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Общо получатели</p>
              <p className="text-3xl font-bold text-gray-900">{campaign.total_recipients}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Успешно изпратени</p>
              <p className="text-3xl font-bold text-green-600">{campaign.successful_sends}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Неуспешни</p>
              <p className="text-3xl font-bold text-red-600">{campaign.failed_sends}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Процент успех</p>
              <p className="text-3xl font-bold text-blue-600">
                {campaign.total_recipients > 0
                  ? Math.round((campaign.successful_sends / campaign.total_recipients) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Campaign Stats Link */}
        {campaign.status === 'sent' && (
          <div className="mb-6">
            <Link
              href={`/staff/campaigns/${campaignId}/stats`}
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold"
            >
              📊 Виж подробна статистика
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация</h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Тема</dt>
                  <dd className="mt-1 text-sm text-gray-900">{campaign.subject}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Статус</dt>
                  <dd className="mt-1">{getStatusBadge(campaign.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Създадена</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.created_at)}</dd>
                </div>
                {campaign.sent_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Изпратена</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.sent_at)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Content Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Съдържание</h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  {showPreview ? 'Скрий преглед' : 'Покажи преглед'}
                </button>
              </div>

              {showPreview ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">HTML преглед</h3>
                    <div 
                      className="border border-gray-300 rounded bg-white p-4 max-h-96 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: campaign.html_content }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Текстова версия</h3>
                    <pre className="border border-gray-300 rounded bg-white p-4 max-h-48 overflow-auto text-sm whitespace-pre-wrap">
                      {campaign.text_content}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Кликнете &quot;Покажи преглед&quot; за да видите съдържанието</p>
              )}
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Действия</h2>
              <div className="space-y-3">
                {campaign.status === 'draft' && (
                  <>
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Изпраща се...' : '📧 Изпрати кампанията'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition"
                    >
                      🗑️ Изтрий кампанията
                    </button>
                  </>
                )}
                {campaign.status === 'sent' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Кампанията е изпратена успешно
                    </p>
                  </div>
                )}
                {campaign.status === 'failed' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ✗ Кампанията е неуспешна
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Съвети</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Прегледайте съдържанието преди изпращане</li>
                <li>• Уверете се, че всички линкове работят</li>
                <li>• Изпратете тестов имейл на себе си</li>
                <li>• След изпращане не може да се редактира</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
