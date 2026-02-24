'use client';

import { useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { trackFunnelStep } from '@/lib/analytics';
import PriceDisplay from '@/components/PriceDisplay';
import type { PricesMap, CatalogData, PriceInfo } from '@/lib/preorder';
import { formatPriceDual, formatSavings, isPremiumBox, isSubscriptionBox } from '@/lib/preorder';
import type { OrderStep } from '@/lib/order';

interface OrderStepConfirmProps {
  prices: PricesMap;
  catalogData: CatalogData;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export default function OrderStepConfirm({
  prices,
  catalogData,
  onBack,
  onSubmit,
  isSubmitting,
}: OrderStepConfirmProps) {
  const store = useOrderStore();
  const hasTrackedStep = useRef(false);

  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('review_order', 4);
      hasTrackedStep.current = true;
    }
  }, []);

  // Resolve labels from catalog data
  const boxTypeNames = catalogData?.labels?.boxTypes ?? {};
  const sportLabels = catalogData?.labels?.sports ?? {};
  const colorLabels = catalogData?.labels?.colors ?? {};
  const flavorLabels = catalogData?.labels?.flavors ?? {};
  const dietaryLabels = catalogData?.labels?.dietary ?? {};
  const sizeLabels = catalogData?.labels?.sizes ?? {};

  // Get price info for current box type
  const priceInfo: PriceInfo | null = store.boxType ? (prices[store.boxType] || null) : null;
  const hasDiscount = priceInfo && priceInfo.discountPercent > 0;

  const isPremium = isPremiumBox(store.boxType);
  const isSubscription = isSubscriptionBox(store.boxType);

  // Navigate to step
  const goToStep = (step: OrderStep) => {
    store.setStep(step);
  };

  // Format full address
  const formatAddress = () => {
    const addr = store.address;
    const parts: string[] = [];
    if (addr.streetAddress) parts.push(addr.streetAddress);
    if (addr.buildingEntrance) parts.push(`Вход ${addr.buildingEntrance}`);
    if (addr.floor) parts.push(`ет. ${addr.floor}`);
    if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
    const line1 = parts.join(', ');
    const line2 = `${addr.postalCode} ${addr.city}`;
    return { line1, line2 };
  };

  return (
    <div>
      {/* Title */}
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Преглед на поръчката
      </h2>

      {/* Summary Cards */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-8 md:mb-10">
        {/* Box Type */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
          <div className="flex justify-between items-start mb-3 sm:mb-4 border-b pb-2">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Кутия</h3>
            <button
              onClick={() => goToStep(1)}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
            >
              Редактирай
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
            <div>
              <div className="text-base sm:text-lg font-semibold text-[var(--color-brand-navy)]">
                {store.boxType && (boxTypeNames[store.boxType] || store.boxType)}
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isSubscription
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isSubscription ? 'Абонамент' : 'Еднократна'}
                </span>
                {isPremium && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-[var(--color-brand-orange)]/10 text-[var(--color-brand-orange)]">
                    Премиум
                  </span>
                )}
              </div>
            </div>
            {priceInfo && (
              <div className="text-left sm:text-right">
                <PriceDisplay priceInfo={priceInfo} />
              </div>
            )}
          </div>

          {/* Promo discount */}
          {hasDiscount && store.promoCode && priceInfo && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 sm:gap-2 text-green-600">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm sm:text-base font-semibold">
                  Промо код {store.promoCode} е приложен – {priceInfo.discountPercent}% отстъпка
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">
                {formatSavings(priceInfo.discountAmountEur, priceInfo.discountAmountBgn)}
              </div>
            </div>
          )}
        </div>

        {/* Personalization */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
          <div className="flex justify-between items-start mb-3 sm:mb-4 border-b pb-2">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Персонализация</h3>
            <button
              onClick={() => goToStep(2)}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
            >
              Редактирай
            </button>
          </div>

          {store.wantsPersonalization ? (
            <div className="space-y-3 sm:space-y-4">
              {store.sports.length > 0 && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">Спорт:</div>
                  <div className="text-sm sm:text-base text-gray-600">
                    {store.sports.map(s => sportLabels[s] || s).join(', ')}
                    {store.sports.includes('other') && store.sportOther && ` (${store.sportOther})`}
                  </div>
                </div>
              )}
              {store.colors.length > 0 && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1.5 sm:mb-2">Цветове:</div>
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                    {store.colors.map(c => (
                      <div key={c} title={colorLabels[c] || c} className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
              {store.flavors.length > 0 && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">Вкусове:</div>
                  <div className="text-sm sm:text-base text-gray-600">
                    {store.flavors.map(f => flavorLabels[f] || f).join(', ')}
                    {store.flavors.includes('other') && store.flavorOther && ` (${store.flavorOther})`}
                  </div>
                </div>
              )}
              {(store.sizeUpper || store.sizeLower) && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">Размери:</div>
                  <div className="text-sm sm:text-base text-gray-600">
                    {store.sizeUpper && <>Горна: {sizeLabels[store.sizeUpper] || store.sizeUpper}</>}
                    {store.sizeUpper && store.sizeLower && ' / '}
                    {store.sizeLower && <>Долна: {sizeLabels[store.sizeLower] || store.sizeLower}</>}
                  </div>
                </div>
              )}
              {store.dietary.length > 0 && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">Хранителни ограничения:</div>
                  <div className="text-sm sm:text-base text-gray-600">
                    {store.dietary.map(d => dietaryLabels[d] || d).join(', ')}
                    {store.dietary.includes('other') && store.dietaryOther && ` (${store.dietaryOther})`}
                  </div>
                </div>
              )}
              {store.additionalNotes && store.additionalNotes.trim() !== '' && (
                <div>
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-0.5 sm:mb-1">Допълнителни бележки:</div>
                  <div className="text-sm sm:text-base text-gray-600">{store.additionalNotes}</div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
                Предпочитанията ти ни помагат да разберем какво харесваш, но не гарантират 100% съвпадение.
              </p>
            </div>
          ) : (
            <p className="text-sm sm:text-base text-gray-600">Оставям избора на вас</p>
          )}
        </div>

        {/* Delivery Data */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
          <div className="flex justify-between items-start mb-3 sm:mb-4 border-b pb-2">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)]">Данни за доставка</h3>
            <button
              onClick={() => goToStep(3)}
              className="text-sm text-[var(--color-brand-orange)] font-semibold hover:underline"
            >
              Редактирай
            </button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="text-sm sm:text-base">
              <span className="font-semibold text-[var(--color-brand-navy)]">Име:</span>
              <span className="ml-1.5 sm:ml-2 text-gray-600">{store.fullName || store.address.fullName}</span>
            </div>
            <div className="text-sm sm:text-base">
              <span className="font-semibold text-[var(--color-brand-navy)]">Имейл:</span>
              <span className="ml-1.5 sm:ml-2 text-gray-600 break-all">{store.email}</span>
            </div>
            {(store.phone || store.address.phone) && (
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[var(--color-brand-navy)]">Телефон:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600">{store.phone || store.address.phone}</span>
              </div>
            )}

            {/* Address display */}
            {store.selectedAddressId ? (
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[var(--color-brand-navy)]">Адрес:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600">Запазен адрес</span>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-1">Адрес:</div>
                <div className="text-sm sm:text-base text-gray-600">
                  <div>{formatAddress().line1}</div>
                  <div>{formatAddress().line2}</div>
                  {store.address.deliveryNotes && (
                    <div className="text-xs text-gray-400 mt-1">
                      Бележки: {store.address.deliveryNotes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price Summary */}
        {priceInfo && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 border-b pb-2">Цена</h3>
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
                    <span>-{formatPriceDual(priceInfo.discountAmountEur, priceInfo.discountAmountBgn)}</span>
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
        )}
      </div>

      {/* Confirmation Message */}
      <div className="bg-gradient-to-br from-[var(--color-brand-orange)]/10 to-[var(--color-brand-orange)]/5 border-l-4 border-[var(--color-brand-orange)] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 md:mb-10">
        <p className="text-sm sm:text-base md:text-lg text-[var(--color-brand-navy)] leading-relaxed text-center font-semibold">
          Моля, прегледай внимателно информацията по-горе. След натискане на &quot;Потвърждавам поръчката&quot;, твоята поръчка ще бъде записана и ще получиш потвърждение на имейла си.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 sm:gap-4 justify-center">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="bg-gray-300 text-[var(--color-brand-navy)] px-4 sm:px-6 md:px-10 py-3 sm:py-4 rounded-full text-xs sm:text-sm md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Назад
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-[var(--color-brand-orange)] text-white px-4 sm:px-6 md:px-12 py-3 sm:py-4 rounded-full text-xs sm:text-sm md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Изпращане...
            </span>
          ) : (
            'Потвърждавам поръчката'
          )}
        </button>
      </div>
    </div>
  );
}
