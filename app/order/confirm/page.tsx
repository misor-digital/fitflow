import {
  getAllBoxPricesMap,
  getBoxTypeNames,
  getBoxTypes,
  getOptions,
  getColors,
  getOptionLabels,
} from '@/lib/data';
import OrderConfirmClient from '@/components/order/OrderConfirmClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CutoffCountdown } from '@/components/CutoffCountdown';
import type { Metadata } from 'next';
import type { CatalogData, BoxType } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Потвърждение на поръчка | FitFlow',
  description: 'Прегледай и потвърди своята FitFlow поръчка',
};

export default async function OrderConfirmPage() {
  // Fetch all catalog data in parallel (server-side, no waterfall)
  const [
    prices,
    boxTypeNames,
    boxTypes,
    sportOptions,
    colorOptions,
    flavorOptions,
    dietaryOptions,
    sizeOptions,
    sportLabels,
    colorLabels,
    flavorLabels,
    dietaryLabels,
    sizeLabels,
  ] = await Promise.all([
    getAllBoxPricesMap(null),
    getBoxTypeNames(),
    getBoxTypes(),
    getOptions('sports'),
    getColors(),
    getOptions('flavors'),
    getOptions('dietary'),
    getOptions('sizes'),
    getOptionLabels('sports'),
    getOptionLabels('colors'),
    getOptionLabels('flavors'),
    getOptionLabels('dietary'),
    getOptionLabels('sizes'),
  ]);

  const mappedBoxTypes: BoxType[] = boxTypes.map((bt) => ({
    id: bt.id as BoxType['id'],
    name: bt.name,
    description: bt.description,
    priceEur: bt.price_eur,
    isSubscription: bt.is_subscription,
    isPremium: bt.is_premium,
    frequency: bt.frequency as BoxType['frequency'],
    sortOrder: bt.sort_order,
  }));

  const catalogData: CatalogData = {
    boxTypes: mappedBoxTypes,
    options: {
      sports: sportOptions,
      colors: colorOptions,
      flavors: flavorOptions,
      dietary: dietaryOptions,
      sizes: sizeOptions,
    },
    labels: {
      boxTypes: boxTypeNames,
      sports: sportLabels,
      colors: colorLabels,
      flavors: flavorLabels,
      dietary: dietaryLabels,
      sizes: sizeLabels,
    },
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-16">
        <OrderConfirmClient initialPrices={prices} catalogData={catalogData} />
      </main>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(360px,calc(100vw-2rem))]">
        <CutoffCountdown variant="card" />
      </div>
      <Footer />
    </>
  );
}
