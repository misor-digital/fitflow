'use client';

/**
 * Email System Health Card
 *
 * Displays real-time health metrics for the email system.
 * Fetches data from /api/admin/emails/health on mount.
 */

import { useEffect, useState } from 'react';
import { formatDateTimeShort } from '@/lib/utils/date';

interface EmailSystemHealth {
  status: 'healthy' | 'warning' | 'error';
  sendingCampaigns: number;
  scheduledCampaigns: number;
  stalledCampaigns: number;
  monthlyUsage: {
    sent: number;
    limit: number;
    percentage: number;
  };
  recentErrorCount: number;
  lastWebhookAt: string | null;
}

const STATUS_CONFIG = {
  healthy: {
    label: 'Здрава',
    icon: '🟢',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
  },
  warning: {
    label: 'Предупреждение',
    icon: '🟡',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
  },
  error: {
    label: 'Грешка',
    icon: '🔴',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
} as const;

export default function EmailHealthCard() {
  const [health, setHealth] = useState<EmailSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/admin/emails/health');
        if (!res.ok) throw new Error('Неуспешно зареждане');
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка');
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border p-6 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="rounded-xl border border-red-200 p-6 bg-red-50">
        <p className="text-red-700 text-sm">
          Грешка при зареждане на системния статус: {error ?? 'Няма данни'}
        </p>
      </div>
    );
  }

  const config = STATUS_CONFIG[health.status];

  // Usage color
  let usageColor = 'text-green-700';
  if (health.monthlyUsage.percentage >= 85) usageColor = 'text-red-700';
  else if (health.monthlyUsage.percentage >= 60) usageColor = 'text-yellow-700';

  // Webhook freshness warning
  const webhookStale =
    health.lastWebhookAt &&
    health.sendingCampaigns > 0 &&
    Date.now() - new Date(health.lastWebhookAt).getTime() > 60 * 60 * 1000;

  return (
    <div className={`rounded-xl border ${config.borderColor} p-6 ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Състояние на системата
        </h3>
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.textColor}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active campaigns */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Активни кампании</p>
          <p className="text-xl font-bold text-[var(--color-brand-navy)]">
            {health.sendingCampaigns}
            {health.scheduledCampaigns > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-1">
                + {health.scheduledCampaigns} насрочени
              </span>
            )}
          </p>
        </div>

        {/* Monthly usage */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Месечна употреба</p>
          <p className={`text-xl font-bold ${usageColor}`}>
            {health.monthlyUsage.sent.toLocaleString('bg-BG')}{' '}
            <span className="text-sm font-normal text-gray-500">
              / {health.monthlyUsage.limit.toLocaleString('bg-BG')}
            </span>
          </p>
        </div>

        {/* Recent errors */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Грешки (24ч)</p>
          <p className={`text-xl font-bold ${health.recentErrorCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {health.recentErrorCount}
          </p>
        </div>

        {/* Stalled campaigns */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Застояли кампании</p>
          <p className={`text-xl font-bold ${health.stalledCampaigns > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {health.stalledCampaigns}
          </p>
        </div>
      </div>

      {/* Webhook warning */}
      {webhookStale && (
        <div className="mt-3 text-xs text-yellow-700 bg-yellow-100 rounded-md px-3 py-2">
          ⚠️ Последен webhook преди повече от 1 час ({health.lastWebhookAt ? formatDateTimeShort(health.lastWebhookAt) : '—'}).
          Проверете Brevo webhook настройките.
        </div>
      )}
    </div>
  );
}
