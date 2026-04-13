'use client';

import { useEffect, useState } from 'react';
import { useDeliveryStore } from '@/store/deliveryStore';

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

interface CutoffCountdownProps {
  variant: 'card' | 'inline';
}

function formatCountdown(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatDeliveryDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  if (!d || !m) return dateStr;
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

function getUrgency(ms: number): 'normal' | 'warning' | 'critical' {
  if (ms < 6 * MS_PER_HOUR) return 'critical';
  if (ms < 24 * MS_PER_HOUR) return 'warning';
  return 'normal';
}

const URGENCY_STYLES = {
  normal: {
    card: 'bg-blue-50 border-blue-200 text-blue-900',
    inline: 'bg-blue-50 border-blue-200 text-blue-900',
    badge: 'bg-blue-600',
  },
  warning: {
    card: 'bg-amber-50 border-amber-300 text-amber-900',
    inline: 'bg-amber-50 border-amber-300 text-amber-900',
    badge: 'bg-amber-500',
  },
  critical: {
    card: 'bg-red-50 border-red-300 text-red-900',
    inline: 'bg-red-50 border-red-300 text-red-900',
    badge: 'bg-red-600',
  },
};

export function CutoffCountdown({ variant }: CutoffCountdownProps) {
  const { upcomingDelivery, fetchUpcomingDelivery } = useDeliveryStore();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('cutoff-countdown-dismissed') === '1';
    }
    return false;
  });

  useEffect(() => {
    fetchUpcomingDelivery();
  }, [fetchUpcomingDelivery]);

  const cutoffAt = upcomingDelivery?.orderCutoffAt;
  const displayDays = upcomingDelivery?.cutoffDisplayDays ?? 5;

  useEffect(() => {
    if (!cutoffAt) return;

    function tick() {
      setRemaining(new Date(cutoffAt!).getTime() - Date.now());
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cutoffAt]);

  // Not visible: no data, cutoff passed, outside display window, or dismissed
  if (
    remaining === null ||
    remaining <= 0 ||
    remaining > displayDays * MS_PER_DAY ||
    dismissed
  ) {
    return null;
  }

  const { days, hours, minutes, seconds } = formatCountdown(remaining);
  const urgency = getUrgency(remaining);
  const styles = URGENCY_STYLES[urgency];
  const deliveryDate = upcomingDelivery?.nextDeliveryDate;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('cutoff-countdown-dismissed', '1');
  }

  if (variant === 'inline') {
    return (
      <div className={`border rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 ${styles.inline}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm sm:text-base font-medium">
            <span>⏰</span>
            <span>
              Поръчай до{' '}
              <strong className="font-bold">
                {days > 0 && `${days}д `}{hours}ч {minutes}мин
              </strong>
              {deliveryDate && (
                <> за доставка на <strong>{formatDeliveryDateShort(deliveryDate)}</strong></>
              )}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
            aria-label="Затвори"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div className={`border-2 rounded-2xl p-6 sm:p-8 text-center shadow-2xl ${styles.card}`}>
      <p className="text-sm font-medium opacity-75 mb-2">
        {deliveryDate && <>Следваща доставка: {formatDeliveryDateShort(deliveryDate)}</>}
      </p>
      <p className="text-base sm:text-lg font-semibold mb-4">
        Време за поръчка:
      </p>

      {/* Countdown digits */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
        {days > 0 && (
          <>
            <CountdownUnit value={days} label="дни" className={styles.badge} />
            <span className="text-2xl font-bold opacity-40">:</span>
          </>
        )}
        <CountdownUnit value={hours} label="часа" className={styles.badge} />
        <span className="text-2xl font-bold opacity-40">:</span>
        <CountdownUnit value={minutes} label="мин" className={styles.badge} />
        <span className="text-2xl font-bold opacity-40">:</span>
        <CountdownUnit value={seconds} label="сек" className={styles.badge} />
      </div>

      <button
        onClick={handleDismiss}
        className="text-xs opacity-50 hover:opacity-100 transition-opacity"
      >
        Скрий
      </button>
    </div>
  );
}

function CountdownUnit({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`${className} text-white text-xl sm:text-2xl font-bold rounded-lg w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center tabular-nums`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs font-medium mt-1 opacity-70">{label}</span>
    </div>
  );
}
