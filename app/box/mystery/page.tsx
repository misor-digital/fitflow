import { getUpcomingCycle, getAllBoxPricesMap, getDeliveryConfigMap } from '@/lib/data';
import { getDeliveryConfig, formatDeliveryDate, calculateNextDeliveryDate } from '@/lib/delivery';
import MysteryBoxContent from '@/components/box/MysteryBoxContent';
import type { Metadata } from 'next';

export const revalidate = 300; // ISR: regenerate at most every 5 min

export const metadata: Metadata = {
  title: 'Еднократна кутия | FitFlow',
  description: 'Поръчай еднократна FitFlow кутия — доставка на следващата дата за абонаменти. Съдържанието е изненада!',
};

export default async function MysteryBoxPage() {
  const [upcomingCycle, prices, configMap] = await Promise.all([
    getUpcomingCycle(),
    getAllBoxPricesMap(null),
    getDeliveryConfigMap(),
  ]);

  const config = getDeliveryConfig(configMap);

  // Use upcoming cycle date, or fall back to calculated next delivery date from config
  let deliveryDateStr: string;
  if (upcomingCycle) {
    deliveryDateStr = upcomingCycle.delivery_date;
  } else {
    const nextDate = calculateNextDeliveryDate(config);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    deliveryDateStr = `${yyyy}-${mm}-${dd}`;
  }

  const nextDeliveryDate = formatDeliveryDate(deliveryDateStr);

  const cycleInfo = upcomingCycle
    ? { id: upcomingCycle.id, deliveryDate: upcomingCycle.delivery_date, title: upcomingCycle.title }
    : null;

  return (
    <MysteryBoxContent
      upcomingCycle={cycleInfo}
      prices={prices}
      nextDeliveryDate={nextDeliveryDate}
    />
  );
}
