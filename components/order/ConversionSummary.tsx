'use client';

import PriceDisplay from '@/components/PriceDisplay';
import { formatPriceDual, formatSavings, isPremiumBox, isSubscriptionBox } from '@/lib/catalog';
import type { PriceInfo, CatalogData, BoxTypeId } from '@/lib/catalog';

/**
 * Serializable legacy order data passed from server to client.
 * Matches the shape produced by the convert page server component.
 */
export interface ConversionSource {
  id: string;
  orderId: string;
  conversionToken: string;
  fullName: string;
  email: string;
  phone: string | null;
  boxType: BoxTypeId;
  wantsPersonalization: boolean;
  sports: string[] | null;
  sportOther: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavorOther: string | null;
  dietary: string[] | null;
  dietaryOther: string | null;
  sizeUpper: string | null;
  sizeLower: string | null;
  additionalNotes: string | null;
  promoCode: string | null;
}

interface ConversionSummaryProps {
  source: ConversionSource;
  priceInfo: PriceInfo;
  catalogData: CatalogData;
  boxTypeNames: Record<string, string>;
}

/**
 * Readonly summary of legacy order data for the conversion flow.
 * Shows box type, personalization choices (with resolved labels), and pricing.
 */
export default function ConversionSummary({
  source,
  priceInfo,
  catalogData,
  boxTypeNames,
}: ConversionSummaryProps) {
  const sportLabels = catalogData?.labels?.sports ?? {};
  const colorLabels = catalogData?.labels?.colors ?? {};
  const flavorLabels = catalogData?.labels?.flavors ?? {};
  const dietaryLabels = catalogData?.labels?.dietary ?? {};
  const sizeLabels = catalogData?.labels?.sizes ?? {};

  const isPremium = isPremiumBox(source.boxType);
  const isSubscription = isSubscriptionBox(source.boxType);
  const hasDiscount = priceInfo.discountPercent > 0;

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header */}
      <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)]">
        Вашата предварителна поръчка
      </h2>

      {/* Box Type Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 border-b pb-2">
          Кутия
        </h3>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
          <div>
            <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">
              {boxTypeNames[source.boxType] || source.boxType}
            </div>
            <div className="flex gap-2 mt-1">
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isSubscription
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isSubscription ? 'Абонамент' : 'Еднократна'}
              </span>
              {isPremium && (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-[var(--color-brand-orange)]/10 text-[var(--color-brand-orange)]">
                  Премиум
                </span>
              )}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <PriceDisplay priceInfo={priceInfo} />
          </div>
        </div>

        {/* Promo discount */}
        {hasDiscount && source.promoCode && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 sm:gap-2 text-green-600">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm sm:text-base font-semibold">
                Промо код {source.promoCode} е приложен – {priceInfo.discountPercent}%
                отстъпка
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">
              {formatSavings(priceInfo.discountAmountEur, priceInfo.discountAmountBgn)}
            </div>
          </div>
        )}
      </div>

      {/* Personalization Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 border-b pb-2">
          Персонализация
        </h3>

        {source.wantsPersonalization ? (
          <div className="space-y-3 sm:space-y-4">
            {source.sports && source.sports.length > 0 && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">
                  Спорт:
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  {source.sports.map((s) => sportLabels[s] || s).join(', ')}
                  {source.sports.includes('other') &&
                    source.sportOther &&
                    ` (${source.sportOther})`}
                </div>
              </div>
            )}
            {source.colors && source.colors.length > 0 && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1.5 sm:mb-2">
                  Цветове:
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {source.colors.map((c) => (
                    <div
                      key={c}
                      title={colorLabels[c] || c}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
            {source.flavors && source.flavors.length > 0 && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">
                  Вкусове:
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  {source.flavors.map((f) => flavorLabels[f] || f).join(', ')}
                  {source.flavors.includes('other') &&
                    source.flavorOther &&
                    ` (${source.flavorOther})`}
                </div>
              </div>
            )}
            {(source.sizeUpper || source.sizeLower) && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">
                  Размери:
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  {source.sizeUpper && (
                    <>Горна: {sizeLabels[source.sizeUpper] || source.sizeUpper}</>
                  )}
                  {source.sizeUpper && source.sizeLower && ' / '}
                  {source.sizeLower && (
                    <>Долна: {sizeLabels[source.sizeLower] || source.sizeLower}</>
                  )}
                </div>
              </div>
            )}
            {source.dietary && source.dietary.length > 0 && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">
                  Хранителни ограничения:
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  {source.dietary.map((d) => dietaryLabels[d] || d).join(', ')}
                  {source.dietary.includes('other') &&
                    source.dietaryOther &&
                    ` (${source.dietaryOther})`}
                </div>
              </div>
            )}
            {source.additionalNotes && source.additionalNotes.trim() !== '' && (
              <div>
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">
                  Допълнителни бележки:
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  {source.additionalNotes}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm sm:text-base text-gray-600">Оставям избора на вас</p>
        )}
      </div>

      {/* Price Summary Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 border-b pb-2">
          Цена
        </h3>
        <div className="space-y-2">
          {hasDiscount ? (
            <>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-600">Оригинална цена:</span>
                <span className="text-gray-400 line-through">
                  {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base text-green-600">
                <span>Отстъпка ({priceInfo.discountPercent}%):</span>
                <span>
                  -{formatPriceDual(priceInfo.discountAmountEur, priceInfo.discountAmountBgn)}
                </span>
              </div>
              <div className="flex justify-between text-lg sm:text-xl font-bold pt-2 border-t border-gray-100">
                <span className="text-[var(--color-brand-navy)]">Крайна цена:</span>
                <span className="text-[var(--color-brand-orange)]">
                  {formatPriceDual(priceInfo.finalPriceEur, priceInfo.finalPriceBgn)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-lg sm:text-xl font-bold">
              <span className="text-[var(--color-brand-navy)]">Цена:</span>
              <span className="text-[var(--color-brand-orange)]">
                {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legacy order reference */}
      <div className="text-sm text-gray-500 text-center">
        предварителна поръчка #{source.orderId}
      </div>
    </div>
  );
}
