/**
 * Campaign List Page
 * 
 * Displays all marketing campaigns with their status, progress, and key metrics.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 * 
 * Features:
 * - Campaign list with status indicators
 * - Progress bars for active campaigns
 * - Aggregate stats (total, sent, failed, skipped)
 * - Links to campaign detail pages
 */

import Link from 'next/link';
import { getAllCampaigns, getCampaignProgress } from '@/lib/marketing';
import type { CampaignStatus, CampaignProgress } from '@/lib/marketing';

// Status badge colors and labels
const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  sending: { label: 'Sending', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  paused: { label: 'Paused', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {status === 'sending' && (
        <span className="w-2 h-2 mr-1.5 bg-amber-500 rounded-full animate-pulse" />
      )}
      {config.label}
    </span>
  );
}

function ProgressBar({ progress }: { progress: CampaignProgress | null }) {
  if (!progress || progress.total === 0) {
    return <span className="text-gray-400 text-sm">No recipients</span>;
  }

  const percent = progress.progress_percent;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{progress.sent} sent</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CampaignWithProgress {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  scheduled_start_at: string | null;
  created_at: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  progress: CampaignProgress | null;
}

export default async function CampaignListPage() {
  // Fetch campaigns from the API
  const { data: campaigns, error } = await getAllCampaigns();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-red-800 font-medium">Error loading campaigns</h2>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  // Fetch progress for each campaign
  const campaignsWithProgress: CampaignWithProgress[] = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { data: progress } = await getCampaignProgress(campaign.id);
      return {
        ...campaign,
        progress: progress || null,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage email marketing campaigns
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {campaignsWithProgress.length} campaign{campaignsWithProgress.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/internal/marketing/campaigns/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        </div>
      </div>

      {/* Campaign List */}
      {campaignsWithProgress.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="text-gray-500 mt-1">Campaigns created via the API will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignsWithProgress.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <ProgressBar progress={campaign.progress} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium">{campaign.progress?.total || campaign.total_recipients}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600">✓ {campaign.progress?.sent || campaign.sent_count}</span>
                        <span className="text-red-600">✗ {campaign.progress?.failed || campaign.failed_count}</span>
                        <span className="text-gray-400">⊘ {campaign.progress?.skipped || campaign.skipped_count}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(campaign.scheduled_start_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(campaign.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/internal/marketing/campaigns/${campaign.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
