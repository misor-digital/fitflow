import { requireStaff } from '@/lib/auth';
import { getEmailStats } from '@/lib/data/email-log';
import { getOrCreateMonthUsage, getUsageHistory } from '@/lib/data/email-usage';
import EmailUsageCard from '@/components/admin/EmailUsageCard';
import EmailStatsCards from '@/components/admin/EmailStatsCards';
import EmailLogTable from '@/components/admin/EmailLogTable';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Имейли | Администрация | FitFlow',
};

const EMAIL_ROLES = ['super_admin', 'admin', 'marketing', 'content'] as const;

export default async function EmailDashboardPage() {
  await requireStaff([...EMAIL_ROLES]);

  // Get current month boundaries
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dateFrom = `${currentMonth}-01T00:00:00.000Z`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${currentMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

  // Fetch all data in parallel
  const [usage, usageHistory, stats] = await Promise.all([
    getOrCreateMonthUsage(),
    getUsageHistory(2), // Current + previous month
    getEmailStats(dateFrom, dateTo),
  ]);

  // Previous month data
  const previousMonth = usageHistory.length > 1 ? usageHistory[1] : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
            Имейл Табло
          </h1>
          <span className="bg-[var(--color-brand-navy)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {currentMonth}
          </span>
        </div>
      </div>

      {/* Section 1 — Monthly Usage */}
      <section className="mb-8">
        <EmailUsageCard
          sent={usage.total_sent}
          limit={usage.monthly_limit}
          previousMonthSent={previousMonth?.total_sent ?? 0}
        />
      </section>

      {/* Section 2 — Summary Stats */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Обобщение
        </h2>
        <EmailStatsCards
          stats={{
            totalSent: stats.total,
            delivered: stats.delivered,
            opened: stats.opened,
            clicked: stats.clicked,
            bounced: stats.bounced,
            spam: stats.spam,
            blocked: stats.blocked,
            failed: stats.failed,
          }}
        />
      </section>

      {/* Section 3 — Email Log */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Имейл Лог
        </h2>
        <EmailLogTable />
      </section>
    </div>
  );
}
