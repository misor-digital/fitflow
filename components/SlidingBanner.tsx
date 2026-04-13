'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDeliveryStore } from '@/store/deliveryStore';

const MS_PER_DAY = 86_400_000;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${minutes}мин`;
  return `${minutes}мин`;
}

function formatDeliveryDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!d || !m) return dateStr;
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

function formatCutoffShort(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}, ${hh}:${min}ч`;
}

export default function SlidingBanner() {
  const pathname = usePathname();
  const { upcomingDelivery, fetchUpcomingDelivery } = useDeliveryStore();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetchUpcomingDelivery();
  }, [fetchUpcomingDelivery]);

  const cutoffAt = upcomingDelivery?.orderCutoffAt;
  const displayDays = upcomingDelivery?.cutoffDisplayDays ?? 5;

  useEffect(() => {
    if (!cutoffAt) return;

    function tick() {
      const ms = new Date(cutoffAt!).getTime() - Date.now();
      setRemaining(ms);
    }

    tick();
    const id = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(id);
  }, [cutoffAt]);

  // Hide on thank-you page
  if (pathname === '/order/thank-you') return null;
  // Hide on admin pages
  if (pathname?.startsWith('/admin')) return null;

  // Visibility: only show within displayDays window and before cutoff
  if (
    remaining === null ||
    remaining <= 0 ||
    remaining > displayDays * MS_PER_DAY
  ) {
    return null;
  }

  const deliveryDate = upcomingDelivery?.nextDeliveryDate;
  const text = `Поръчай до ${formatCutoffShort(cutoffAt!)} за доставка на ${deliveryDate ? formatDeliveryDateShort(deliveryDate) : ''}! Остават ${formatCountdown(remaining)}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-brand-navy)] overflow-hidden h-10 sm:h-12 flex items-center">
      <div className="sliding-banner-content whitespace-nowrap flex">
        {[...Array(3)].map((_, i) => (
          <span key={i} className="inline-flex items-center px-12 sm:px-16 md:px-24">
            <span className="text-[#FFD700] font-bold text-xs sm:text-sm md:text-base tracking-wide">
              ⏰ {text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
