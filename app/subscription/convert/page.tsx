import { getOrderByConversionToken } from '@/lib/data/order-subscription-conversion';
import { mapOrderBoxToSubscriptionBox } from '@/lib/subscription/order-conversion';
import {
  calculatePrice,
  getBoxTypeNames,
  getBoxTypes,
  getOptions,
  getColors,
  getOptionLabels,
  getUpcomingCycle,
} from '@/lib/data';
import ConversionError from '@/components/subscription/ConversionError';
import SubscriptionConversionFlow from '@/components/subscription/SubscriptionConversionFlow';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';
import type { CatalogData, BoxType } from '@/lib/catalog';
import type { SubscriptionConversionSource } from '@/components/subscription/conversion-types';

export const metadata: Metadata = {
  title: 'Конвертиране към абонамент — FitFlow',
};

/** UUID v4 regex for basic format validation */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SubscriptionConvertPageProps {
  searchParams: Promise<{ token?: string; promo?: string }>;
}

export default async function SubscriptionConvertPage({
  searchParams,
}: SubscriptionConvertPageProps) {
  const { token, promo } = await searchParams;

  // No token provided
  if (!token) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-white">
          <ConversionError message="Липсва токен за конвертиране." />
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
  const order = await getOrderByConversionToken(token);

  if (!order) {
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

  // Token is valid — fetch catalog data, price, and delivery info
  const subscriptionBoxType = mapOrderBoxToSubscriptionBox(order.box_type);

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
    upcomingCycle,
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
    calculatePrice(subscriptionBoxType, promo || order.promo_code || null),
    getUpcomingCycle(),
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

  const conversionSource: SubscriptionConversionSource = {
    orderId: order.id,
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    customerFullName: order.customer_full_name,
    customerPhone: order.customer_phone,
    userId: order.user_id,
    boxType: subscriptionBoxType,
    wantsPersonalization: order.wants_personalization,
    sports: order.sports,
    sportOther: order.sport_other,
    colors: order.colors,
    flavors: order.flavors,
    flavorOther: order.flavor_other,
    dietary: order.dietary,
    dietaryOther: order.dietary_other,
    sizeUpper: order.size_upper,
    sizeLower: order.size_lower,
    additionalNotes: order.additional_notes,
    conversionToken: token,
    campaignPromoCode: promo || null,
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-16">
        <SubscriptionConversionFlow
          source={conversionSource}
          priceInfo={priceInfo}
          catalogData={catalogData}
          boxTypeNames={boxTypeNames}
          upcomingCycle={upcomingCycle}
        />
      </main>
      <Footer />
    </>
  );
}
