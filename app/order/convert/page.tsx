import { getPreorderByToken } from '@/lib/data';
import { calculatePrice } from '@/lib/data';
import {
  getAllBoxPricesMap,
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
import type { CatalogData, BoxType, BoxTypeId } from '@/lib/preorder';
import type { PreorderForConversion } from '@/components/order/PreorderSummary';

export const metadata: Metadata = {
  title: 'Завършете поръчката | FitFlow',
  description: 'Превърнете предпоръчката си в поръчка',
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
  const preorder = await getPreorderByToken(token);

  if (!preorder) {
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
    calculatePrice(preorder.box_type, preorder.promo_code),
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

  // Map preorder DB row to serializable client format
  const preorderForConversion: PreorderForConversion = {
    id: preorder.id,
    orderId: preorder.order_id,
    conversionToken: token,
    fullName: preorder.full_name,
    email: preorder.email,
    phone: preorder.phone ?? null,
    boxType: preorder.box_type as BoxTypeId,
    wantsPersonalization: preorder.wants_personalization,
    sports: preorder.sports ?? null,
    sportOther: preorder.sport_other ?? null,
    colors: preorder.colors ?? null,
    flavors: preorder.flavors ?? null,
    flavorOther: preorder.flavor_other ?? null,
    dietary: preorder.dietary ?? null,
    dietaryOther: preorder.dietary_other ?? null,
    sizeUpper: preorder.size_upper ?? null,
    sizeLower: preorder.size_lower ?? null,
    additionalNotes: preorder.additional_notes ?? null,
    promoCode: preorder.promo_code ?? null,
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        <ConversionFlow
          preorder={preorderForConversion}
          priceInfo={priceInfo}
          catalogData={catalogData}
          boxTypeNames={boxTypeNames}
        />
      </main>
      <Footer />
    </>
  );
}
