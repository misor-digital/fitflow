import {
  getCurrentRevealedCycle,
  getCycleItems,
  getUpcomingCycle,
  getAllBoxPricesMap,
  getDeliveryConfigMap,
} from '@/lib/data';
import { getDeliveryConfig, formatDeliveryDate, formatMonthYear } from '@/lib/delivery';
import RevealedBoxContent from '@/components/box/RevealedBoxContent';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const cycle = await getCurrentRevealedCycle();
  const monthYear = cycle ? formatMonthYear(cycle.delivery_date) : '';
  return {
    title: `Текуща кутия ${monthYear} | FitFlow`,
    description: `Виж какво има в кутията за ${monthYear} — поръчай еднократно с бърза доставка!`,
  };
}

export default async function RevealedBoxPage() {
  // 1. Check if revealed box feature is enabled
  const configMap = await getDeliveryConfigMap();
  const config = getDeliveryConfig(configMap);

  if (!config.revealedBoxEnabled) {
    redirect('/');
  }

  // 2. Load current revealed cycle
  const cycle = await getCurrentRevealedCycle();
  if (!cycle) {
    redirect('/');
  }

  // 3. Load cycle items, upcoming cycle for "available until", and prices in parallel
  const [items, upcomingCycle, prices] = await Promise.all([
    getCycleItems(cycle.id),
    getUpcomingCycle(),
    getAllBoxPricesMap(null),
  ]);

  // 4. Compute display values
  const monthYear = formatMonthYear(cycle.delivery_date);
  const availableUntil = upcomingCycle
    ? formatDeliveryDate(upcomingCycle.delivery_date)
    : '';

  return (
    <RevealedBoxContent
      cycle={{
        id: cycle.id,
        deliveryDate: cycle.delivery_date,
        title: cycle.title,
        description: cycle.description,
      }}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.image_url,
        category: item.category,
        sortOrder: item.sort_order,
      }))}
      prices={prices}
      availableUntil={availableUntil}
      monthYear={monthYear}
    />
  );
}
