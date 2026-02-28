'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SubscriptionWithDelivery } from '@/lib/subscription';
import type { AddressRow } from '@/lib/supabase/types';
import type { PricesMap, CatalogData } from '@/lib/catalog';
import SubscriptionCard from './SubscriptionCard';

export interface SubscriptionDashboardProps {
  subscriptions: SubscriptionWithDelivery[];
  upcomingCycle: { id: string; deliveryDate: string; title: string | null } | null;
  boxTypeNames: Record<string, string>;
  addresses: AddressRow[];
  prices: PricesMap;
  catalogOptions: CatalogData;
  eurToBgnRate: number;
}

export function SubscriptionDashboard({
  subscriptions: initialSubscriptions,
  upcomingCycle,
  boxTypeNames,
  addresses,
  prices,
  catalogOptions,
  eurToBgnRate,
}: SubscriptionDashboardProps) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);

  /** Refresh a single subscription after an action */
  const refreshSubscription = async (id: string) => {
    try {
      const res = await fetch(`/api/subscription/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === id
            ? {
                ...data.subscription,
                nextDeliveryDate: upcomingCycle?.deliveryDate ?? null,
                nextCycleId: upcomingCycle?.id ?? null,
              }
            : sub,
        ),
      );
    } catch {
      // Fallback: refetch all
      try {
        const res = await fetch('/api/subscription');
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions);
        }
      } catch { /* ignore */ }
    }
  };

  // Empty state
  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-[var(--color-brand-navy)] mb-2">
          Нямате активни абонаменти.
        </h2>
        <p className="text-gray-500 mb-6">
          Абонирайте се за месечна кутия и получете FitFlow доставка до вратата ви.
        </p>
        <Link
          href="/order"
          className="inline-block bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Поръчай месечна кутия →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptions.map((sub) => (
        <SubscriptionCard
          key={sub.id}
          subscription={sub}
          boxTypeName={boxTypeNames[sub.box_type] ?? sub.box_type}
          upcomingCycle={upcomingCycle}
          addresses={addresses}
          prices={prices}
          catalogOptions={catalogOptions}
          eurToBgnRate={eurToBgnRate}
          onRefresh={() => refreshSubscription(sub.id)}
        />
      ))}
    </div>
  );
}
