import { requireAuth } from '@/lib/auth';
import {
  getSubscriptionsByUser,
  getUpcomingCycles,
  getDeliveryCycles,
  getAllBoxPricesMap,
  getBoxTypeNames,
  getAddressesByUser,
  getBoxTypes,
  getOptions,
  getColors,
  getEurToBgnRate,
  enrichSubscriptionsWithLastCycle,
} from '@/lib/data';
import { SubscriptionDashboard } from '@/components/account/SubscriptionDashboard';
import { findNextCycleForSubscription } from '@/lib/subscription';
import type { SubscriptionWithDelivery } from '@/lib/subscription';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Моите абонаменти | FitFlow',
};

export default async function SubscriptionsPage() {
  const { userId } = await requireAuth();

  // Fetch all data in parallel
  const [
    subscriptions,
    upcomingCycles,
    allCycles,
    boxTypeNames,
    prices,
    addresses,
    boxTypes,
    sports,
    colors,
    flavors,
    dietary,
    sizes,
    eurToBgnRate,
  ] = await Promise.all([
    getSubscriptionsByUser(userId),
    getUpcomingCycles(),
    getDeliveryCycles(),
    getBoxTypeNames(),
    getAllBoxPricesMap(null),
    getAddressesByUser(userId),
    getBoxTypes(),
    getOptions('sports'),
    getColors(),
    getOptions('flavors'),
    getOptions('dietary'),
    getOptions('sizes'),
    getEurToBgnRate(),
  ]);

  // Sort all cycles ascending by date for shouldIncludeInCycle
  const allCyclesSorted = [...allCycles].sort(
    (a, b) => a.delivery_date.localeCompare(b.delivery_date),
  );

  // Self-heal subscriptions with missing last_delivered_cycle_id
  const healedSubscriptions = await enrichSubscriptionsWithLastCycle(subscriptions);

  // Enrich subscriptions with next delivery info (per-subscription cycle matching)
  const enriched: SubscriptionWithDelivery[] = healedSubscriptions.map((sub) => {
    const nextCycle = findNextCycleForSubscription(sub, upcomingCycles, allCyclesSorted);
    return {
      ...sub,
      nextDeliveryDate: nextCycle?.delivery_date ?? null,
      nextCycleId: nextCycle?.id ?? null,
    };
  });

  // Build label maps for catalog data
  const sportLabels = sports.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
  const flavorLabels = flavors.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
  const dietaryLabels = dietary.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
  const colorLabels = colors.reduce((acc, c) => { acc[c.hex] = c.label; return acc; }, {} as Record<string, string>);
  const sizeLabels = sizes.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
  const boxTypeLabels = boxTypes.reduce((acc, bt) => { acc[bt.id] = bt.name; return acc; }, {} as Record<string, string>);

  const catalogOptions: import('@/lib/catalog').CatalogData = {
    boxTypes: boxTypes.map((bt) => ({
      id: bt.id as import('@/lib/catalog').BoxTypeId,
      name: bt.name,
      description: bt.description,
      priceEur: bt.price_eur,
      isSubscription: bt.is_subscription,
      isPremium: bt.is_premium,
      frequency: bt.frequency as 'monthly' | 'seasonal' | null,
      sortOrder: bt.sort_order,
    })),
    options: { sports, colors, flavors, dietary, sizes },
    labels: {
      boxTypes: boxTypeLabels,
      sports: sportLabels,
      colors: colorLabels,
      flavors: flavorLabels,
      dietary: dietaryLabels,
      sizes: sizeLabels,
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-6">
        Моите абонаменти
      </h1>
      <SubscriptionDashboard
        subscriptions={enriched}
        boxTypeNames={boxTypeNames}
        addresses={addresses}
        prices={prices}
        catalogOptions={catalogOptions}
        eurToBgnRate={eurToBgnRate}
      />
    </div>
  );
}
