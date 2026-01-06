/**
 * Campaign Reporting Section Component
 * 
 * Displays comprehensive reporting metrics for a campaign including:
 * - Summary stats (sent, failed, skipped, clicks, leads)
 * - Conversion rates (sent→lead, click→lead)
 * - Breakdowns by box type and promo usage
 * - Follow-up campaign list
 * 
 * PRODUCTION SAFETY: This component is only rendered in internal pages
 * which are protected by environment checks.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CampaignReportingStats {
  totalEligible: number;
  sent: number;
  failed: number;
  skipped: number;
  clicks: number;
  uniqueClickers: number;
  leads: number;
  revenue: number;
  sentToLeadRate: number;
  clickToLeadRate: number;
  timeWindow: {
    start: string | null;
    end: string;
  };
}

interface LeadsByBoxType {
  boxType: string;
  leadCount: number;
  revenue: number;
}

interface LeadsByPromo {
  hasPromo: boolean;
  leadCount: number;
  revenue: number;
  avgDiscount: number;
}

interface FollowUpCampaign {
  id: string;
  name: string;
  status: string;
  campaignType: string;
  followUpWindowHours: number | null;
  sentCount: number;
  createdAt: string;
}

interface CampaignReportingData {
  stats: CampaignReportingStats;
  breakdowns: {
    byBoxType: LeadsByBoxType[];
    byPromo: LeadsByPromo[];
  };
  followUps: FollowUpCampaign[];
}

interface CampaignReportingSectionProps {
  campaignId: string;
  campaignStatus: string;
}

function StatCard({
  label,
  value,
  subValue,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textClasses = {
    gray: 'text-gray-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${textClasses[color]}`}>{value}</p>
      {subValue && <p className="mt-1 text-xs text-gray-500">{subValue}</p>}
    </div>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function CampaignReportingSection({ campaignId, campaignStatus }: CampaignReportingSectionProps) {
  const [data, setData] = useState<CampaignReportingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchReporting = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/reporting`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reporting data');
      }

      setData(result.reporting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !data) {
      fetchReporting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, campaignId]);

  // Only show for campaigns that have started sending
  const showReporting = ['sending', 'completed', 'paused', 'cancelled'].includes(campaignStatus);

  if (!showReporting) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Campaign Reporting</h2>
          <p className="text-sm text-gray-500">Performance metrics and conversion data</p>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={fetchReporting}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {isExpanded ? 'Hide Reporting' : 'Show Reporting'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isLoading && !data ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-gray-500">Loading reporting data...</span>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Time Window */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Campaign period: </span>
                <span className="font-medium text-gray-700">
                  {formatDate(data.stats.timeWindow.start)} → {formatDate(data.stats.timeWindow.end)}
                </span>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard label="Sent" value={data.stats.sent} color="green" />
                <StatCard label="Failed" value={data.stats.failed} color="red" />
                <StatCard label="Skipped" value={data.stats.skipped} color="gray" />
                <StatCard label="Clicks" value={data.stats.clicks} subValue={`${data.stats.uniqueClickers} unique`} color="blue" />
                <StatCard label="Leads" value={data.stats.leads} color="purple" />
                <StatCard label="Revenue" value={formatCurrency(data.stats.revenue)} color="amber" />
              </div>

              {/* Conversion Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-purple-50 rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-500">Sent → Lead Conversion</p>
                  <p className="mt-1 text-3xl font-bold text-purple-700">{data.stats.sentToLeadRate}%</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {data.stats.leads} leads from {data.stats.sent} sent emails
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-500">Click → Lead Conversion</p>
                  <p className="mt-1 text-3xl font-bold text-purple-700">{data.stats.clickToLeadRate}%</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {data.stats.leads} leads from {data.stats.uniqueClickers} clickers
                  </p>
                </div>
              </div>

              {/* Breakdowns */}
              {(data.breakdowns.byBoxType.length > 0 || data.breakdowns.byPromo.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* By Box Type */}
                  {data.breakdowns.byBoxType.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Leads by Box Type</h3>
                      <div className="space-y-2">
                        {data.breakdowns.byBoxType.map((item) => (
                          <div key={item.boxType} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.boxType}</span>
                            <div className="text-right">
                              <span className="font-medium text-gray-900">{item.leadCount} leads</span>
                              <span className="text-gray-400 ml-2">({formatCurrency(item.revenue)})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Promo Usage */}
                  {data.breakdowns.byPromo.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Leads by Promo Usage</h3>
                      <div className="space-y-2">
                        {data.breakdowns.byPromo.map((item) => (
                          <div key={item.hasPromo ? 'with' : 'without'} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {item.hasPromo ? 'With promo code' : 'Without promo code'}
                            </span>
                            <div className="text-right">
                              <span className="font-medium text-gray-900">{item.leadCount} leads</span>
                              {item.hasPromo && item.avgDiscount > 0 && (
                                <span className="text-gray-400 ml-2">(avg {item.avgDiscount.toFixed(0)}% off)</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Follow-Up Campaigns */}
              {data.followUps.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Follow-Up Campaigns</h3>
                  <div className="space-y-2">
                    {data.followUps.map((followUp) => (
                      <Link
                        key={followUp.id}
                        href={`/internal/marketing/campaigns/${followUp.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            Follow-up
                          </span>
                          <span className="text-sm font-medium text-gray-900">{followUp.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">{followUp.sentCount} sent</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            followUp.status === 'completed' ? 'bg-green-100 text-green-700' :
                            followUp.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                            followUp.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {followUp.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
