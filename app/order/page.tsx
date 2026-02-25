import {
  getAllBoxPricesMap,
  getBoxTypeNames,
  getBoxTypes,
  getOptions,
  getColors,
  getOptionLabels,
} from '@/lib/data';
import OrderFlow from '@/components/order/OrderFlow';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';
import type { CatalogData, BoxType } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Поръчка | FitFlow',
  description: 'Поръчайте вашата FitFlow кутия за активни дами',
};

interface OrderPageProps {
  searchParams: Promise<{
    boxType?: string;
    cycleId?: string;
    orderType?: string;
  }>;
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
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

  // Map BoxTypeRow (snake_case) → BoxType (camelCase)
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

  // Assemble CatalogData for client components
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
        <OrderFlow
          initialPrices={prices}
          boxTypeNames={boxTypeNames}
          catalogData={catalogData}
          initialBoxType={params.boxType}
          deliveryCycleId={params.cycleId}
          orderType={params.orderType}
        />
      </main>
      <Footer />
    </>
  );
}
