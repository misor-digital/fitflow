'use client';

import { useState, useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { trackFunnelStep, trackBoxSelection } from '@/lib/analytics';
import PriceDisplay from '@/components/PriceDisplay';
import type { PricesMap, BoxTypeId, PriceInfo } from '@/lib/preorder';
import { getDisplayBoxType, getPremiumFrequency, buildBoxTypeId } from '@/lib/preorder';

interface OrderStepBoxProps {
  prices: PricesMap;
  boxTypeNames: Record<string, string>;
  onNext: () => void;
}

export default function OrderStepBox({ prices, boxTypeNames, onNext }: OrderStepBoxProps) {
  const { boxType, setBoxType, promoCode } = useOrderStore();
  const hasTrackedStep = useRef(false);

  // Track funnel step on mount
  useEffect(() => {
    if (!hasTrackedStep.current) {
      trackFunnelStep('box_selection', 1);
      hasTrackedStep.current = true;
    }
  }, []);

  // Initialize selected state using shared helper
  const [selected, setSelected] = useState<string | null>(() => getDisplayBoxType(boxType));

  // Initialize premium frequency using shared helper
  const [premiumFrequency, setPremiumFrequency] = useState<'monthly' | 'seasonal'>(() =>
    getPremiumFrequency(boxType),
  );

  // Get price info for a box type
  const getPriceInfo = (boxTypeId: string): PriceInfo | null => {
    return prices[boxTypeId] || null;
  };

  const monthlyStandardPrice = getPriceInfo('monthly-standard');
  const monthlyPremiumPrice = getPriceInfo('monthly-premium');
  const onetimeStandardPrice = getPriceInfo('onetime-standard');
  const onetimePremiumPrice = getPriceInfo('onetime-premium');

  const hasDiscount = promoCode && monthlyStandardPrice && monthlyStandardPrice.discountPercent > 0;

  // Helper to get box type name for GA4 tracking
  const getBoxTypeName = (boxTypeId: string): string => {
    return boxTypeNames[boxTypeId] || boxTypeId;
  };

  const handleSelect = (id: string) => {
    setSelected(id);

    if (id === 'monthly-premium') {
      const finalSelection = buildBoxTypeId(id, premiumFrequency);
      setBoxType(finalSelection);

      const priceInfo = getPriceInfo(id);
      trackBoxSelection({
        box_type: finalSelection,
        box_name: getBoxTypeName(finalSelection),
        price: priceInfo?.finalPriceEur,
        currency: 'EUR',
        has_promo: !!promoCode,
      });
    } else {
      setBoxType(id as BoxTypeId);

      const priceInfo = getPriceInfo(id);
      trackBoxSelection({
        box_type: id,
        box_name: getBoxTypeName(id),
        price: priceInfo?.finalPriceEur,
        currency: 'EUR',
        has_promo: !!promoCode,
      });
    }
  };

  const handleFrequencySelect = (frequency: 'monthly' | 'seasonal') => {
    setPremiumFrequency(frequency);
    setSelected('monthly-premium');
    const finalSelection = buildBoxTypeId('monthly-premium', frequency);
    setBoxType(finalSelection);

    const priceInfo = getPriceInfo('monthly-premium');
    trackBoxSelection({
      box_type: finalSelection,
      box_name: getBoxTypeName(finalSelection),
      price: priceInfo?.finalPriceEur,
      currency: 'EUR',
      has_promo: !!promoCode,
    });
  };

  return (
    <div>
      {/* Title */}
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Избери кутия
      </h2>

      {/* Discount Banner */}
      {hasDiscount && monthlyStandardPrice && (
        <div className="bg-gradient-to-r from-[var(--color-brand-orange)]/10 to-[var(--color-brand-orange)]/5 border-l-4 border-[var(--color-brand-orange)] p-3 sm:p-4 rounded-lg sm:rounded-xl mb-6 sm:mb-8">
          <p className="text-sm sm:text-base text-[var(--color-brand-navy)] font-semibold">
            🎉 Промо код <span className="text-[var(--color-brand-orange)] font-bold">{promoCode}</span> е приложен – {monthlyStandardPrice.discountPercent}% отстъпка на всички кутии!
          </p>
        </div>
      )}

      {/* Subscription Types */}
      <div className="space-y-6 sm:space-y-8 md:space-y-10 mb-6 sm:mb-8 md:mb-10">
        {/* Monthly Subscription */}
        <div className="bg-white rounded-xl sm:rounded-[20px] p-4 sm:p-6 md:p-8 shadow-lg">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] mb-1 sm:mb-2">Месечна</h3>
          <p className="text-sm sm:text-base md:text-lg text-[var(--color-brand-orange)] font-semibold uppercase tracking-wide mb-4 sm:mb-5 md:mb-6">Абонамент</p>

          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            {/* Standard */}
            <div
              onClick={() => handleSelect('monthly-standard')}
              className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                selected === 'monthly-standard'
                  ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                  : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div
                className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                  selected === 'monthly-standard' ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                }`}
              >
                {selected === 'monthly-standard' && (
                  <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />
                )}
              </div>

              <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3 md:mb-4">Стандартна</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                Получаваш кутия с 5-7 продукта, включително протеинови продукти, здравословни снакове, хранителни добавки и спортни аксесоари
              </p>
              {monthlyStandardPrice && <PriceDisplay priceInfo={monthlyStandardPrice} />}
            </div>

            {/* Premium */}
            <div
              onClick={() => handleSelect('monthly-premium')}
              className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                selected === 'monthly-premium'
                  ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                  : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div className="absolute top-2 sm:top-2.5 right-11 sm:right-14 bg-[var(--color-brand-orange)] text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[0.6rem] sm:text-[0.7rem] font-semibold uppercase tracking-wide">
                Премиум
              </div>

              <div
                className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                  selected === 'monthly-premium' ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                }`}
              >
                {selected === 'monthly-premium' && (
                  <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />
                )}
              </div>

              <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3 md:mb-4">Премиум</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                Получаваш всичко от стандартната кутия плюс <span className="text-[var(--color-brand-orange)] font-bold">спортно облекло</span>
              </p>
              {monthlyPremiumPrice && <PriceDisplay priceInfo={monthlyPremiumPrice} />}

              {/* Frequency Selection */}
              <div className="pt-3 sm:pt-4 md:pt-5 mt-3 sm:mt-4 md:mt-5 border-t-2 border-gray-100">
                <div className="text-sm sm:text-base font-semibold text-[var(--color-brand-navy)] mb-3 sm:mb-4">
                  Колко често искаш да получаваш кутията?
                </div>
                <div className="flex gap-2 sm:gap-3 md:gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFrequencySelect('monthly');
                    }}
                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 md:px-5 border-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                      premiumFrequency === 'monthly'
                        ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                        : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)] hover:-translate-y-0.5'
                    }`}
                  >
                    Всеки месец
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFrequencySelect('seasonal');
                    }}
                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 md:px-5 border-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                      premiumFrequency === 'seasonal'
                        ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                        : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)] hover:-translate-y-0.5'
                    }`}
                  >
                    Всеки 3 месеца
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* One-time Purchase */}
        <div className="bg-white rounded-xl sm:rounded-[20px] p-4 sm:p-6 md:p-8 shadow-lg">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-brand-navy)] mb-1 sm:mb-2">Еднократна</h3>
          <p className="text-sm sm:text-base md:text-lg text-[var(--color-brand-orange)] font-semibold uppercase tracking-wide mb-4 sm:mb-5 md:mb-6">Без абонамент</p>

          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            {/* Standard */}
            <div
              onClick={() => handleSelect('onetime-standard')}
              className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                selected === 'onetime-standard'
                  ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                  : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div
                className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                  selected === 'onetime-standard' ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                }`}
              >
                {selected === 'onetime-standard' && (
                  <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />
                )}
              </div>

              <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3 md:mb-4">Стандартна</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                Получаваш кутия с 5-7 продукта, включително протеинови продукти, здравословни снакове, хранителни добавки и спортни аксесоари
              </p>
              {onetimeStandardPrice && <PriceDisplay priceInfo={onetimeStandardPrice} />}
            </div>

            {/* Premium */}
            <div
              onClick={() => handleSelect('onetime-premium')}
              className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                selected === 'onetime-premium'
                  ? 'border-[var(--color-brand-orange)] bg-gradient-to-br from-[var(--color-brand-orange)]/5 to-[var(--color-brand-orange)]/2'
                  : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div className="absolute top-2 sm:top-2.5 right-11 sm:right-14 bg-[var(--color-brand-orange)] text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[0.6rem] sm:text-[0.7rem] font-semibold uppercase tracking-wide">
                Премиум
              </div>

              <div
                className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                  selected === 'onetime-premium' ? 'border-[var(--color-brand-orange)]' : 'border-gray-300'
                }`}
              >
                {selected === 'onetime-premium' && (
                  <div className="w-full h-full rounded-full bg-[var(--color-brand-orange)] scale-[0.5]" />
                )}
              </div>

              <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3 md:mb-4">Премиум</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                Получаваш всичко от стандартната кутия плюс <span className="text-[var(--color-brand-orange)] font-bold">спортно облекло</span>
              </p>
              {onetimePremiumPrice && <PriceDisplay priceInfo={onetimePremiumPrice} />}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 sm:gap-4 justify-center">
        <button
          onClick={onNext}
          disabled={!selected}
          className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
        >
          Напред
        </button>
      </div>
    </div>
  );
}
