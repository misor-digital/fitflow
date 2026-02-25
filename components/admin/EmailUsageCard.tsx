/**
 * Email Usage Card Component
 *
 * Displays monthly email usage with a progress bar, color-coded warning,
 * and trend comparison to previous month.
 */

interface EmailUsageCardProps {
  sent: number;
  limit: number;
  previousMonthSent: number;
}

export default function EmailUsageCard({ sent, limit, previousMonthSent }: EmailUsageCardProps) {
  const percentage = limit > 0 ? Math.round((sent / limit) * 100) : 0;

  // Color coding: green < 60%, yellow 60-85%, red > 85%
  let barColor = 'bg-green-500';
  let textColor = 'text-green-700';
  let bgColor = 'bg-green-50';
  if (percentage >= 85) {
    barColor = 'bg-red-500';
    textColor = 'text-red-700';
    bgColor = 'bg-red-50';
  } else if (percentage >= 60) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-700';
    bgColor = 'bg-yellow-50';
  }

  // Trend calculation
  let trendText = '';
  let trendColor = 'text-gray-500';
  if (previousMonthSent > 0) {
    const change = Math.round(((sent - previousMonthSent) / previousMonthSent) * 100);
    if (change > 0) {
      trendText = `↑ ${change}% спрямо миналия месец`;
      trendColor = 'text-orange-600';
    } else if (change < 0) {
      trendText = `↓ ${Math.abs(change)}% спрямо миналия месец`;
      trendColor = 'text-green-600';
    } else {
      trendText = 'Без промяна спрямо миналия месец';
    }
  } else if (sent > 0) {
    trendText = 'Няма данни за предходния месец';
  }

  return (
    <div className={`rounded-xl p-6 ${bgColor} border`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Месечна употреба
          </h3>
          <p className={`text-3xl font-bold mt-1 ${textColor}`}>
            {sent.toLocaleString('bg-BG')} <span className="text-lg font-normal text-gray-500">/ {limit.toLocaleString('bg-BG')}</span>
          </p>
        </div>
        <span className={`text-2xl font-bold ${textColor}`}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Trend */}
      {trendText && (
        <p className={`text-xs ${trendColor}`}>{trendText}</p>
      )}

      {/* Warning messages */}
      {percentage >= 95 && (
        <p className="text-xs text-red-600 font-semibold mt-2">
          ⚠️ Критично ниво — близо до лимита!
        </p>
      )}
      {percentage >= 80 && percentage < 95 && (
        <p className="text-xs text-yellow-700 font-medium mt-2">
          ⚡ Приближавате 80% от лимита
        </p>
      )}
    </div>
  );
}
