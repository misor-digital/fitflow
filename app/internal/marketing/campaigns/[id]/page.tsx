/**
 * Campaign Detail Page
 * 
 * Displays detailed information about a single marketing campaign including:
 * - Full campaign metadata
 * - Current status with visual indicators
 * - Live progress counters
 * - Action buttons (dry-run, pause, resume)
 * - Send history summary
 * - Email preview (rendered HTML)
 * - Template source (read-only)
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignById, getCampaignProgress } from '@/lib/marketing';
import type { CampaignStatus, CampaignProgress } from '@/lib/marketing';
import { CampaignActions } from './CampaignActions';
import { SendHistorySection } from './SendHistorySection';
import { EmailPreviewSection } from './EmailPreviewSection';
import { RecipientListSection } from './RecipientListSection';

// Status badge colors and labels
const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bgColor: string; description: string }> = {
  draft: { 
    label: 'Draft', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    description: 'Campaign is being prepared and has not been started yet.'
  },
  scheduled: { 
    label: 'Scheduled', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    description: 'Campaign is scheduled to start at the specified time.'
  },
  sending: { 
    label: 'Sending', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100',
    description: 'Campaign is actively sending emails to recipients.'
  },
  paused: { 
    label: 'Paused', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    description: 'Campaign has been paused and can be resumed.'
  },
  completed: { 
    label: 'Completed', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    description: 'Campaign has finished sending to all recipients.'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    description: 'Campaign was cancelled and cannot be resumed.'
  },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ProgressStats({ progress }: { progress: CampaignProgress | null }) {
  if (!progress) {
    return <p className="text-gray-500">No progress data available</p>;
  }

  const stats = [
    { label: 'Total', value: progress.total, color: 'text-gray-900', bgColor: 'bg-gray-100' },
    { label: 'Queued', value: progress.queued, color: 'text-blue-700', bgColor: 'bg-blue-50' },
    { label: 'Sending', value: progress.sending, color: 'text-amber-700', bgColor: 'bg-amber-50' },
    { label: 'Sent', value: progress.sent, color: 'text-green-700', bgColor: 'bg-green-50' },
    { label: 'Failed', value: progress.failed, color: 'text-red-700', bgColor: 'bg-red-50' },
    { label: 'Skipped', value: progress.skipped, color: 'text-gray-500', bgColor: 'bg-gray-50' },
    { label: 'Bounced', value: progress.bounced, color: 'text-purple-700', bgColor: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bgColor} rounded-lg p-4 text-center`}>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

interface RecipientFilter {
  tags?: string[];
  tagsAny?: string[];
  excludeTags?: string[];
  subscribedOnly?: boolean;
}

function RecipientFilterDisplay({ filter }: { filter: RecipientFilter | null }) {
  if (!filter) {
    return <span className="text-gray-500">All subscribed recipients</span>;
  }

  const parts: React.ReactNode[] = [];

  // Subscribed only
  if (filter.subscribedOnly !== false) {
    parts.push(
      <span key="subscribed" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mr-1">
        ✓ Subscribed only
      </span>
    );
  } else {
    parts.push(
      <span key="all" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mr-1">
        All recipients
      </span>
    );
  }

  // Required tags (must have ALL)
  if (filter.tags && filter.tags.length > 0) {
    parts.push(
      <div key="tags" className="mt-1">
        <span className="text-xs text-gray-500">Must have ALL: </span>
        {filter.tags.map(tag => (
          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mr-1">
            {tag}
          </span>
        ))}
      </div>
    );
  }

  // Any tags (must have ANY)
  if (filter.tagsAny && filter.tagsAny.length > 0) {
    parts.push(
      <div key="tagsAny" className="mt-1">
        <span className="text-xs text-gray-500">Must have ANY: </span>
        {filter.tagsAny.map(tag => (
          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mr-1">
            {tag}
          </span>
        ))}
      </div>
    );
  }

  // Exclude tags
  if (filter.excludeTags && filter.excludeTags.length > 0) {
    parts.push(
      <div key="excludeTags" className="mt-1">
        <span className="text-xs text-gray-500">Exclude: </span>
        {filter.excludeTags.map(tag => (
          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-1">
            ✗ {tag}
          </span>
        ))}
      </div>
    );
  }

  if (parts.length === 0) {
    return <span className="text-gray-500">All subscribed recipients</span>;
  }

  return <div className="space-y-1">{parts}</div>;
}

function ProgressBar({ progress }: { progress: CampaignProgress | null }) {
  if (!progress || progress.total === 0) {
    return null;
  }

  const percent = progress.progress_percent;
  const sentPercent = (progress.sent / progress.total) * 100;
  const failedPercent = (progress.failed / progress.total) * 100;
  const skippedPercent = (progress.skipped / progress.total) * 100;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Progress</span>
        <span className="font-medium">{percent.toFixed(1)}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
        <div 
          className="bg-green-500 h-4 transition-all duration-300"
          style={{ width: `${sentPercent}%` }}
          title={`Sent: ${progress.sent}`}
        />
        <div 
          className="bg-red-500 h-4 transition-all duration-300"
          style={{ width: `${failedPercent}%` }}
          title={`Failed: ${progress.failed}`}
        />
        <div 
          className="bg-gray-400 h-4 transition-all duration-300"
          style={{ width: `${skippedPercent}%` }}
          title={`Skipped: ${progress.skipped}`}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Sent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span> Failed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span> Skipped
          </span>
        </div>
        <span>{progress.queued} remaining</span>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch campaign data
  const { data: campaign, error } = await getCampaignById(id);

  if (error || !campaign) {
    notFound();
  }

  // Fetch progress
  const { data: progress } = await getCampaignProgress(id);

  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/internal/marketing/campaigns"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Campaigns
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-gray-500">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-3">
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <Link
              href={`/internal/marketing/campaigns/${campaign.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          )}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
            {campaign.status === 'sending' && (
              <span className="w-2 h-2 mr-2 bg-amber-500 rounded-full animate-pulse" />
            )}
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Status Description */}
      <div className={`${statusConfig.bgColor} border rounded-lg p-4`}>
        <p className={`text-sm ${statusConfig.color}`}>
          <strong>Status:</strong> {statusConfig.description}
        </p>
      </div>

      {/* Warning: Sends to unsubscribed recipients */}
      {campaign.recipient_filter?.subscribedOnly === false && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-800">⚠️ Sends to Unsubscribed Recipients</h3>
              <p className="text-sm text-red-700 mt-1">
                This campaign is configured to send to <strong>ALL recipients</strong>, including those who have unsubscribed. 
                This may violate GDPR, CAN-SPAM, or other email marketing regulations. 
                Only use this for mandatory transactional communications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Progress</h2>
        <ProgressStats progress={progress} />
        <ProgressBar progress={progress} />
      </div>

      {/* Actions Section */}
      <CampaignActions campaign={campaign} />

      {/* Campaign Details */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Campaign ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{campaign.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{statusConfig.label}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Scheduled Start</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.scheduled_start_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Started At</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.started_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Completed At</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.completed_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Preview Text</dt>
            <dd className="mt-1 text-sm text-gray-900">{campaign.preview_text || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Recipient Filter</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <RecipientFilterDisplay filter={campaign.recipient_filter} />
            </dd>
          </div>
        </dl>
      </div>

      {/* Recipient List */}
      <RecipientListSection filter={campaign.recipient_filter} />

      {/* Email Preview */}
      <EmailPreviewSection templateData={campaign.template} />

      {/* Send History */}
      <SendHistorySection campaignId={campaign.id} />
    </div>
  );
}
