/**
 * Email Stats Cards Component
 *
 * Displays 4 summary stat cards: Total Sent, Delivered, Opened, Clicked.
 * Below: delivery rate, bounce rate, spam rate as small metrics.
 */

interface EmailStatsCardsProps {
  stats: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    spam: number;
    blocked: number;
    failed: number;
  };
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  return `${(Math.round((numerator / denominator) * 1000) / 10).toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  rate,
  rateLabel,
  icon,
  color,
}: {
  label: string;
  value: number;
  rate?: string;
  rateLabel?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color}`}>
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString('bg-BG')}
      </p>
      {rate && (
        <p className="text-xs text-gray-500 mt-1">
          {rateLabel}: <span className="font-semibold text-gray-700">{rate}</span>
        </p>
      )}
    </div>
  );
}

export default function EmailStatsCards({ stats }: EmailStatsCardsProps) {
  const deliveryRate = formatRate(stats.delivered, stats.totalSent);
  const openRate = formatRate(stats.opened, stats.delivered);
  const clickRate = formatRate(stats.clicked, stats.opened);
  const bounceRate = formatRate(stats.bounced, stats.totalSent);
  const spamRate = formatRate(stats.spam, stats.totalSent);

  return (
    <div>
      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Общо изпратени"
          value={stats.totalSent}
          icon="📤"
          color="bg-blue-50"
        />
        <StatCard
          label="Доставени"
          value={stats.delivered}
          rate={deliveryRate}
          rateLabel="Процент доставка"
          icon="✅"
          color="bg-green-50"
        />
        <StatCard
          label="Отворени"
          value={stats.opened}
          rate={openRate}
          rateLabel="Процент отваряне"
          icon="👁️"
          color="bg-purple-50"
        />
        <StatCard
          label="Кликнати"
          value={stats.clicked}
          rate={clickRate}
          rateLabel="Процент клик"
          icon="🔗"
          color="bg-orange-50"
        />
      </div>

      {/* Secondary metrics */}
      <div className="flex flex-wrap gap-6 text-sm text-gray-600">
        <span>
          Процент доставка: <span className="font-semibold text-gray-800">{deliveryRate}</span>
        </span>
        <span>
          Отхвърлени: <span className="font-semibold text-red-600">{bounceRate}</span>
          <span className="text-gray-400 ml-1">({stats.bounced})</span>
        </span>
        <span>
          Спам: <span className="font-semibold text-red-600">{spamRate}</span>
          <span className="text-gray-400 ml-1">({stats.spam})</span>
        </span>
        {stats.blocked > 0 && (
          <span>
            Блокирани: <span className="font-semibold text-red-600">{stats.blocked}</span>
          </span>
        )}
        {stats.failed > 0 && (
          <span>
            Неуспешни: <span className="font-semibold text-red-600">{stats.failed}</span>
          </span>
        )}
      </div>
    </div>
  );
}
