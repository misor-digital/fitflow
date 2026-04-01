'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CampaignStatusBadge from './CampaignStatusBadge';
import CampaignTypeBadge from './CampaignTypeBadge';
import CampaignHistoryTimeline from './CampaignHistoryTimeline';
import SendTestEmailModal from './SendTestEmailModal';
import type {
  EmailCampaignRow,
  EmailCampaignHistoryRow,
  EmailCampaignRecipientRow,
  EmailRecipientStatusEnum,
} from '@/lib/supabase/types';

interface ABVariantResult {
  id: string;
  variantLabel: string;
  subject: string | null;
  templateId: number | null;
  recipientPercentage: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  openRate: number;
  clickRate: number;
}

interface ABTestData {
  campaignId: string;
  variants: ABVariantResult[];
  totalRecipients: number;
  hasMinimumSample: boolean;
}

interface ABWinner {
  winnerId: string;
  variantLabel: string;
  metric: number;
}

interface RecipientStats {
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  skipped: number;
}

interface CampaignDetailViewProps {
  campaign: EmailCampaignRow;
  recipientStats: RecipientStats;
  recipients: EmailCampaignRecipientRow[];
  recipientsTotal: number;
  recipientsPage: number;
  recipientsPerPage: number;
  history: EmailCampaignHistoryRow[];
  unsubscribeCount?: number;
}

/** Mask email for GDPR: i***@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return `${local[0]}***@${domain}`;
}

const RECIPIENT_STATUS_LABELS: Record<EmailRecipientStatusEnum, { label: string; className: string }> = {
  pending: { label: 'Чакащ', className: 'text-gray-600' },
  sent: { label: 'Изпратен', className: 'text-blue-600' },
  delivered: { label: 'Доставен', className: 'text-green-600' },
  opened: { label: 'Отворен', className: 'text-green-700' },
  clicked: { label: 'Кликнат', className: 'text-green-800' },
  bounced: { label: 'Отхвърлен', className: 'text-orange-600' },
  failed: { label: 'Неуспешен', className: 'text-red-600' },
  skipped: { label: 'Пропуснат', className: 'text-gray-400' },
};

export default function CampaignDetailView({
  campaign,
  recipientStats,
  recipients,
  recipientsTotal,
  recipientsPage,
  recipientsPerPage,
  history,
  unsubscribeCount = 0,
}: CampaignDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(new Set());

  // A/B test state
  const [abTestData, setAbTestData] = useState<ABTestData | null>(null);
  const [abWinner, setAbWinner] = useState<ABWinner | null>(null);
  const [abLoading, setAbLoading] = useState(false);

  const totalRecipients = campaign.total_recipients;
  const sentCount = campaign.sent_count;
  const failedCount = campaign.failed_count;
  const pendingCount = recipientStats.pending;
  const progressPct = totalRecipients > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0;

  const recipientsTotalPages = Math.max(1, Math.ceil(recipientsTotal / recipientsPerPage));

  // Fetch A/B test data on mount
  useEffect(() => {
    async function fetchABTest() {
      setAbLoading(true);
      try {
        const res = await fetch(`/api/admin/campaigns/${campaign.id}/ab-test`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.variants?.length > 0) {
            setAbTestData(json.data);
            setAbWinner(json.winner ?? null);
          }
        }
      } catch {
        // Non-critical
      } finally {
        setAbLoading(false);
      }
    }
    fetchABTest();
  }, [campaign.id]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const executeAction = useCallback(
    async (
      endpoint: string,
      method: 'POST' | 'DELETE' = 'POST',
      body?: Record<string, unknown>,
      successMsg?: string,
    ) => {
      setError(null);
      setSuccess(null);

      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/campaigns/${campaign.id}${endpoint}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!res.ok) {
            const json = await res.json().catch(() => null);
            setError(json?.error ?? `Грешка (${res.status}).`);
            return;
          }

          setSuccess(successMsg ?? 'Действието е изпълнено.');
          router.refresh();
        } catch {
          setError('Мрежова грешка. Опитайте отново.');
        }
      });
    },
    [campaign.id, router, startTransition],
  );

  function handleStart() {
    setShowStartConfirm(false);
    executeAction('/start', 'POST', undefined, 'Кампанията е стартирана.');
  }

  function handlePause() {
    executeAction('/pause', 'POST', undefined, 'Кампанията е паузирана.');
  }

  function handleResume() {
    executeAction('/resume', 'POST', undefined, 'Кампанията е продължена.');
  }

  function handleCancel() {
    setShowCancelConfirm(false);
    executeAction('/cancel', 'POST', { reason: cancelReason || undefined }, 'Кампанията е отказана.');
    setCancelReason('');
  }

  function handleDelete() {
    setShowDeleteConfirm(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error ?? `Грешка (${res.status}).`);
          return;
        }
        router.push('/admin/campaigns');
      } catch {
        setError('Мрежова грешка.');
      }
    });
  }

  function handleRestart() {
    // Create a copy - redirect to create page with pre-filled type
    router.push(`/admin/campaigns/create`);
  }

  function handleDuplicate() {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/admin/campaigns/${campaign.id}/duplicate`, {
          method: 'POST',
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error ?? `Грешка при дублиране (${res.status}).`);
          return;
        }
        const { data } = await res.json();
        router.push(`/admin/campaigns/${data.id}`);
      } catch {
        setError('Мрежова грешка при дублиране.');
      }
    });
  }

  function toggleEmailReveal(recipientId: string) {
    setRevealedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(recipientId)) {
        next.delete(recipientId);
      } else {
        next.add(recipientId);
      }
      return next;
    });
  }

  // Build URL for recipient pagination
  function recipientPageUrl(page: number) {
    const params = new URLSearchParams();
    params.set('rPage', String(page));
    return `/admin/campaigns/${campaign.id}?${params.toString()}`;
  }

  // ------------------------------------------------------------------
  // Status-based actions
  // ------------------------------------------------------------------
  const actionButtons: React.ReactNode[] = [];

  if (campaign.status === 'draft') {
    actionButtons.push(
      <button
        key="test"
        onClick={() => setShowTestModal(true)}
        className="border border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-brand-navy)] hover:text-white transition-colors"
      >
        📧 Изпрати тестов
      </button>,
      <button
        key="start"
        onClick={() => setShowStartConfirm(true)}
        disabled={isPending}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        ▶ Стартирай
      </button>,
      <button
        key="delete"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isPending}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        🗑 Изтрий
      </button>,
    );
  }

  if (campaign.status === 'scheduled') {
    actionButtons.push(
      <button
        key="start-now"
        onClick={() => setShowStartConfirm(true)}
        disabled={isPending}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        ▶ Стартирай сега
      </button>,
      <button
        key="cancel"
        onClick={() => setShowCancelConfirm(true)}
        disabled={isPending}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        ✕ Отказ
      </button>,
    );
  }

  if (campaign.status === 'sending') {
    actionButtons.push(
      <button
        key="pause"
        onClick={handlePause}
        disabled={isPending}
        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        ⏸ Паузирай
      </button>,
      <button
        key="cancel"
        onClick={() => setShowCancelConfirm(true)}
        disabled={isPending}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        ✕ Отказ
      </button>,
    );
  }

  if (campaign.status === 'paused') {
    actionButtons.push(
      <button
        key="resume"
        onClick={handleResume}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        ▶ Продължи
      </button>,
      <button
        key="cancel"
        onClick={() => setShowCancelConfirm(true)}
        disabled={isPending}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        ✕ Отказ
      </button>,
    );
  }

  if (campaign.status === 'failed') {
    actionButtons.push(
      <button
        key="restart"
        onClick={handleRestart}
        className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        🔄 Рестартирай
      </button>,
    );
  }

  // Duplicate button - available for all statuses
  actionButtons.push(
    <button
      key="duplicate"
      onClick={handleDuplicate}
      disabled={isPending}
      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      📋 Дублирай
    </button>,
  );

  return (
    <div>
      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            {campaign.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <CampaignStatusBadge status={campaign.status} />
            <CampaignTypeBadge type={campaign.campaign_type} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Тема: {campaign.subject}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionButtons}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500">Общо получатели</p>
          <p className="text-2xl font-bold text-gray-700">{totalRecipients}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Изпратени</p>
          <p className="text-2xl font-bold text-green-700">{sentCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Неуспешни</p>
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-400">
          <p className="text-sm text-gray-500">Чакащи</p>
          <p className="text-2xl font-bold text-gray-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-400">
          <p className="text-sm text-gray-500">Отписани</p>
          <p className="text-2xl font-bold text-orange-600">{unsubscribeCount}</p>
        </div>
      </div>

      {/* A/B Test Results */}
      {abLoading && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 text-center text-gray-400 text-sm">
          Зареждане на A/B резултати...
        </div>
      )}
      {abTestData && abTestData.variants.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-semibold text-[var(--color-brand-navy)]">
              A/B Тест Резултати
            </h2>
          </div>
          <div className="p-5">
            {!abTestData.hasMinimumSample && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 mb-4 text-sm">
                ⚠️ Минималният размер на извадката не е достигнат (50 доставени на вариант). Резултатите може да не са представителни.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Метрика</th>
                    {abTestData.variants.map((v) => (
                      <th key={v.id} className="px-4 py-3 font-semibold text-gray-600">
                        Вариант {v.variantLabel}
                        {abWinner && abWinner.winnerId === v.id && (
                          <span className="ml-2 text-green-600" title="Победител">🏆</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Тема</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">
                        {v.subject ?? <span className="text-gray-400">По подразбиране</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Изпратени</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">{v.sentCount}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Доставени</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">{v.deliveredCount}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Отворени</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">
                        {v.openedCount} ({v.openRate}%)
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Кликнати</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">
                        {v.clickedCount} ({v.clickRate}%)
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Разпределение</td>
                    {abTestData.variants.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-gray-600">{v.recipientPercentage}%</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {abWinner && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                🏆 <strong>Победител: Вариант {abWinner.variantLabel}</strong> с {abWinner.metric}% (по избрания критерий)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {totalRecipients > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Прогрес</p>
            <p className="text-sm text-gray-500">{progressPct}%</p>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {sentCount} от {totalRecipients} изпратени
          </p>
        </div>
      )}

      {/* Recipients table */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-[var(--color-brand-navy)]">
            Получатели
          </h2>
        </div>

        {recipients.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Няма получатели.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Имейл</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Име</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Статус</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Изпратен</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Грешка</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recipients.map((r) => {
                    const statusInfo = RECIPIENT_STATUS_LABELS[r.status] ?? {
                      label: r.status,
                      className: 'text-gray-500',
                    };
                    const isRevealed = revealedEmails.has(r.id);

                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleEmailReveal(r.id)}
                            className="text-left text-gray-700 hover:text-[var(--color-brand-navy)]"
                            title={isRevealed ? 'Скрий имейл' : 'Покажи имейл'}
                          >
                            {isRevealed ? r.email : maskEmail(r.email)}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          {r.status === 'skipped' && r.error?.includes('Отписан') && (
                            <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">
                              Отписан
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {r.sent_at
                            ? new Date(r.sent_at).toLocaleString('bg-BG')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-red-500 text-xs max-w-[200px] truncate" title={r.error ?? ''}>
                          {r.error ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recipient pagination */}
            {recipientsTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-4 border-t">
                {recipientsPage > 1 && (
                  <a
                    href={recipientPageUrl(recipientsPage - 1)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    ← Предишна
                  </a>
                )}
                <span className="text-sm text-gray-500">
                  Стр. {recipientsPage} от {recipientsTotalPages}
                </span>
                {recipientsPage < recipientsTotalPages && (
                  <a
                    href={recipientPageUrl(recipientsPage + 1)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    Следваща →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Audit history */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          История на действията
        </h2>
        <CampaignHistoryTimeline history={history} />
      </div>

      {/* Modals */}

      {/* Test email modal */}
      {showTestModal && (
        <SendTestEmailModal
          campaignId={campaign.id}
          onClose={() => setShowTestModal(false)}
        />
      )}

      {/* Start confirmation */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStartConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-3">
              Стартиране на кампанията
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Сигурни ли сте, че искате да стартирате кампания &ldquo;{campaign.name}&rdquo;?
              Ще бъдат изпратени имейли до <strong>{totalRecipients}</strong> получатели.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStartConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Назад
              </button>
              <button
                onClick={handleStart}
                disabled={isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? 'Стартиране...' : 'Стартирай'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-3">
              Отказ на кампанията
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Това действие не може да бъде отменено.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Причина (по избор)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="напр. Грешен шаблон"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Назад
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Отказване...' : 'Откажи'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-700 mb-3">
              Изтриване на кампанията
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Сигурни ли сте? Всички данни за тази кампания ще бъдат изтрити безвъзвратно.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Назад
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Изтриване...' : 'Изтрий'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
