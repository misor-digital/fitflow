/**
 * Send History Section Component
 * 
 * Displays a summary and list of send records for a campaign.
 * Shows status, timestamps, attempts, and error messages.
 * 
 * PRODUCTION SAFETY: This component is only rendered within the
 * internal layout which is gated by environment checks.
 * 
 * NOTE: Does not expose raw email addresses in bulk to prevent
 * data exposure. Shows masked emails or counts only.
 */

import { supabase } from '@/lib/supabase';
import type { SendStatus } from '@/lib/marketing';

interface SendRecord {
  id: string;
  email: string;
  status: SendStatus;
  error: string | null;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
  sent_at: string | null;
  next_retry_at: string | null;
}

// Status badge colors
const SEND_STATUS_CONFIG: Record<SendStatus, { label: string; color: string; bgColor: string }> = {
  queued: { label: 'Queued', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  sending: { label: 'Sending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  sent: { label: 'Sent', color: 'text-green-700', bgColor: 'bg-green-50' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-50' },
  skipped: { label: 'Skipped', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  bounced: { label: 'Bounced', color: 'text-purple-700', bgColor: 'bg-purple-50' },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  
  const maskedLocal = local.length > 2 
    ? local[0] + '***' + local[local.length - 1]
    : '***';
  
  return `${maskedLocal}@${domain}`;
}

function SendStatusBadge({ status }: { status: SendStatus }) {
  const config = SEND_STATUS_CONFIG[status] || SEND_STATUS_CONFIG.queued;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

interface SendHistorySectionProps {
  campaignId: string;
}

async function getSendHistory(campaignId: string, limit: number = 50): Promise<{
  sends: SendRecord[];
  total: number;
  error: Error | null;
}> {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('marketing_sends')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    if (countError) {
      return { sends: [], total: 0, error: new Error(countError.message) };
    }

    // Get recent sends (prioritize failed and recent)
    const { data: sends, error } = await supabase
      .from('marketing_sends')
      .select('id, email, status, error, attempt_count, max_attempts, created_at, sent_at, next_retry_at')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { sends: [], total: 0, error: new Error(error.message) };
    }

    return { 
      sends: (sends || []) as SendRecord[], 
      total: count || 0, 
      error: null 
    };
  } catch (err) {
    return { 
      sends: [], 
      total: 0, 
      error: err instanceof Error ? err : new Error('Unknown error') 
    };
  }
}

export async function SendHistorySection({ campaignId }: SendHistorySectionProps) {
  const { sends, total, error } = await getSendHistory(campaignId);

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send History</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">Error loading send history: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Send History</h2>
        <span className="text-sm text-gray-500">
          Showing {sends.length} of {total} sends
        </span>
      </div>

      {sends.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900">No sends yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Send records will appear here once the campaign starts.
          </p>
        </div>
      ) : (
        <>
          {/* Summary by Status */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(SEND_STATUS_CONFIG).map(([status, config]) => {
              const count = sends.filter(s => s.status === status).length;
              if (count === 0) return null;
              return (
                <span 
                  key={status}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                >
                  {config.label}: {count}
                </span>
              );
            })}
          </div>

          {/* Send Records Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Attempts
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Sent At
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sends.map((send) => (
                  <tr key={send.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">
                        {maskEmail(send.email)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <SendStatusBadge status={send.status} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {send.attempt_count} / {send.max_attempts}
                      {send.next_retry_at && send.status === 'failed' && (
                        <span className="block text-xs text-gray-400">
                          Retry: {formatDate(send.next_retry_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(send.sent_at)}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600 max-w-xs truncate" title={send.error || undefined}>
                      {send.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note about data privacy */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Email addresses are partially masked for privacy. 
              Full email addresses are stored securely and not exposed in bulk.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
