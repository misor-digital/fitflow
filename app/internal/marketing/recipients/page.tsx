/**
 * Recipients Overview Page
 * 
 * Displays aggregate statistics about marketing recipients:
 * - Total recipient count
 * - Subscribed vs unsubscribed breakdown
 * - Tag/group distribution
 * - Source distribution
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 * 
 * NOTE: This page does NOT expose raw email lists. It only shows
 * aggregate counts and statistics to protect recipient privacy.
 */

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface RecipientStats {
  total: number;
  subscribed: number;
  unsubscribed: number;
  tagCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  recentCount: number; // Last 30 days
}

interface RecipientRow {
  subscribed: boolean;
  tags: string[];
  source: string | null;
  created_at: string;
}

async function getRecipientStats(): Promise<{ data: RecipientStats | null; error: Error | null }> {
  try {
    // Get all recipients for aggregation
    const { data, error } = await supabase
      .from('marketing_recipients')
      .select('subscribed, tags, source, created_at');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const recipients = data as RecipientRow[] | null;

    if (!recipients || recipients.length === 0) {
      return {
        data: {
          total: 0,
          subscribed: 0,
          unsubscribed: 0,
          tagCounts: {},
          sourceCounts: {},
          recentCount: 0,
        },
        error: null,
      };
    }

    // Calculate stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats: RecipientStats = {
      total: recipients.length,
      subscribed: 0,
      unsubscribed: 0,
      tagCounts: {},
      sourceCounts: {},
      recentCount: 0,
    };

    for (const recipient of recipients) {
      // Subscription status
      if (recipient.subscribed) {
        stats.subscribed++;
      } else {
        stats.unsubscribed++;
      }

      // Tags
      const tags = recipient.tags as string[] || [];
      for (const tag of tags) {
        stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
      }

      // Source
      const source = (recipient.source as string) || 'unknown';
      stats.sourceCounts[source] = (stats.sourceCounts[source] || 0) + 1;

      // Recent
      if (new Date(recipient.created_at) >= thirtyDaysAgo) {
        stats.recentCount++;
      }
    }

    return { data: stats, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error') 
    };
  }
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  color = 'blue' 
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'gray' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  const textClasses = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    gray: 'text-gray-700',
    amber: 'text-amber-700',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className={`mt-2 text-3xl font-bold ${textClasses[color]}`}>{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function DistributionChart({ 
  title, 
  data, 
  total 
}: { 
  title: string; 
  data: Record<string, number>; 
  total: number;
}) {
  const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {sortedEntries.map(([key, count]) => {
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{key}</span>
                <span className="text-gray-500">{count} ({percent.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function RecipientsOverviewPage() {
  const { data: stats, error } = await getRecipientStats();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipients Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aggregate statistics about marketing recipients
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Error loading recipient stats</h2>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipients Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aggregate statistics about marketing recipients
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No recipient data available</p>
        </div>
      </div>
    );
  }

  const subscriptionRate = stats.total > 0 
    ? ((stats.subscribed / stats.total) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipients Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aggregate statistics about marketing recipients
          </p>
        </div>
        <Link 
          href="/internal/marketing/campaigns"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Campaigns →
        </Link>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Recipients" 
          value={stats.total} 
          subtitle="All time"
          color="blue"
        />
        <StatCard 
          title="Subscribed" 
          value={stats.subscribed} 
          subtitle={`${subscriptionRate}% subscription rate`}
          color="green"
        />
        <StatCard 
          title="Unsubscribed" 
          value={stats.unsubscribed} 
          color="red"
        />
        <StatCard 
          title="Recent (30 days)" 
          value={stats.recentCount} 
          subtitle="New recipients"
          color="amber"
        />
      </div>

      {/* Subscription Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-700 font-medium">Subscribed</span>
              <span className="text-gray-500">{stats.subscribed}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
              <div 
                className="bg-green-500 h-4 transition-all duration-300"
                style={{ width: `${stats.total > 0 ? (stats.subscribed / stats.total) * 100 : 0}%` }}
              />
              <div 
                className="bg-red-400 h-4 transition-all duration-300"
                style={{ width: `${stats.total > 0 ? (stats.unsubscribed / stats.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-red-600 font-medium">Unsubscribed</span>
              <span className="text-gray-500">{stats.unsubscribed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart 
          title="By Tag" 
          data={stats.tagCounts} 
          total={stats.total}
        />
        <DistributionChart 
          title="By Source" 
          data={stats.sourceCounts} 
          total={stats.total}
        />
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Data Privacy
        </h3>
        <p className="mt-2 text-sm text-blue-700">
          This page shows <strong>aggregate statistics only</strong>. Individual email addresses 
          are not displayed to protect recipient privacy. Raw recipient data is only accessible 
          through protected server-side APIs.
        </p>
      </div>
    </div>
  );
}
