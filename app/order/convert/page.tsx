import { getPreorderByToken } from '@/lib/data';
import { calculatePrice } from '@/lib/data';
import {
  getBoxTypeNames,
  getBoxTypes,
  getOptions,
  getColors,
  getOptionLabels,
} from '@/lib/data';
import ConversionFlow from '@/components/order/ConversionFlow';
import ConversionError from '@/components/order/ConversionError';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';
import type { CatalogData, BoxType, BoxTypeId } from '@/lib/catalog';
import type { ConversionSource } from '@/components/order/ConversionSummary';

export const metadata: Metadata = {
  title: 'Завършете поръчката | FitFlow',
  description: 'Превърнете предварителната си поръчката в поръчка',
};

/** UUID v4 regex for basic format validation */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ConvertPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ConvertPage({ searchParams }: ConvertPageProps) {
  const { token } = await searchParams;

  // No token provided
  if (!token) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-white">
          <ConversionError message="Липсва токен за преобразуване." />
        </main>
        <Footer />
      </>
    );
  }

  // Invalid UUID format
  if (!UUID_REGEX.test(token)) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-white">
          <ConversionError message="Невалиден линк." />
        </main>
        <Footer />
      </>
    );
  }

  // Validate token against database
  const legacyOrder = await getPreorderByToken(token);

  if (!legacyOrder) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-white">
          <ConversionError message="Линкът е невалиден, изтекъл или вече използван." />
        </main>
        <Footer />
      </>
    );
  }

  // Token is valid — fetch catalog data and calculate price
  const [
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
    priceInfo,
  ] = await Promise.all([
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
    calculatePrice(legacyOrder.box_type, legacyOrder.promo_code),
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

  // Map legacy order DB row to serializable client format
  const conversionSource: ConversionSource = {
    id: legacyOrder.id,
    orderId: legacyOrder.order_id,
    conversionToken: token,
    fullName: legacyOrder.full_name,
    email: legacyOrder.email,
    phone: legacyOrder.phone ?? null,
    boxType: legacyOrder.box_type as BoxTypeId,
    wantsPersonalization: legacyOrder.wants_personalization,
    sports: legacyOrder.sports ?? null,
    sportOther: legacyOrder.sport_other ?? null,
    colors: legacyOrder.colors ?? null,
    flavors: legacyOrder.flavors ?? null,
    flavorOther: legacyOrder.flavor_other ?? null,
    dietary: legacyOrder.dietary ?? null,
    dietaryOther: legacyOrder.dietary_other ?? null,
    sizeUpper: legacyOrder.size_upper ?? null,
    sizeLower: legacyOrder.size_lower ?? null,
    additionalNotes: legacyOrder.additional_notes ?? null,
    promoCode: legacyOrder.promo_code ?? null,
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-16">
        <ConversionFlow
          source={conversionSource}
          priceInfo={priceInfo}
          catalogData={catalogData}
          boxTypeNames={boxTypeNames}
        />
      </main>
      <Footer />
    </>
  );
}
