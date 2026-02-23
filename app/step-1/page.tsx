'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import { trackInitiateCheckout, trackBeginCheckout, trackFunnelStep, trackBoxSelection } from '@/lib/analytics';
import PriceDisplay from '@/components/PriceDisplay';
import Link from 'next/link';
import type { PriceInfo, PricesMap, BoxTypeId } from '@/lib/preorder';
import { getDisplayBoxType, getPremiumFrequency, buildBoxTypeId } from '@/lib/preorder';

export default function Step1() {
  const router = useRouter();
  const { boxType, setBoxType, promoCode } = useFormStore();
  const hasTrackedInitiateCheckout = useRef(false);
  
  // Track InitiateCheckout (Meta) and begin_checkout (GA4) when user starts the form flow
  useEffect(() => {
    if (!hasTrackedInitiateCheckout.current) {
      // Meta Pixel
      trackInitiateCheckout();
      // GA4
      trackBeginCheckout();
      trackFunnelStep('box_selection', 1);
      hasTrackedInitiateCheckout.current = true;
    }
  }, []);
  
  // Prices and box type names state - fetched from API
  const [prices, setPrices] = useState<PricesMap | null>(null);
  const [boxTypeNames, setBoxTypeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize selected state using shared helper
  const [selected, setSelected] = useState<string | null>(() => getDisplayBoxType(boxType));
  
  // Initialize premium frequency using shared helper
  const [premiumFrequency, setPremiumFrequency] = useState<'monthly' | 'seasonal'>(() => 
    getPremiumFrequency(boxType)
  );

  // Fetch prices and box type names from API
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch prices
        const pricesUrl = promoCode 
          ? `/api/catalog?type=prices&promoCode=${encodeURIComponent(promoCode)}`
          : '/api/catalog?type=prices';
        
        // Fetch box types for names (only once, not dependent on promoCode)
        const response = await fetch(pricesUrl, { signal: controller.signal });
        
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        
        const data = await response.json();
        setPrices(data.prices);
        const boxTypesData = data.boxTypes;
        setBoxTypeNames(boxTypesData || []);
        
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error fetching data:', err);
        setError('Грешка при зареждане на цените. Моля, опитайте отново.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
    return () => controller.abort();
  }, [promoCode]);

  // Get price info for a box type
  const getPriceInfo = (boxTypeId: string): PriceInfo | null => {
    if (!prices) return null;
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
    
    // Handle premium frequency selection using shared helper
    if (id === 'monthly-premium') {
      const finalSelection = buildBoxTypeId(id, premiumFrequency);
      setBoxType(finalSelection);
      
      // Track box selection in GA4
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
      
      // Track box selection in GA4
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
    
    // Always select the premium box and update with frequency
    setSelected('monthly-premium');
    const finalSelection = buildBoxTypeId('monthly-premium', frequency);
    setBoxType(finalSelection);
    
    // Track frequency selection in GA4
    const priceInfo = getPriceInfo('monthly-premium');
    trackBoxSelection({
      box_type: finalSelection,
      box_name: getBoxTypeName(finalSelection),
      price: priceInfo?.finalPriceEur,
      currency: 'EUR',
      has_promo: !!promoCode,
    });
  };

  const handleContinue = () => {
    if (selected) {
      router.push('/step-2');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FB7D00] mx-auto mb-4"></div>
          <p className="text-[#023047] font-semibold">Зареждане...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#FB7D00] text-white px-6 py-3 rounded-full font-semibold"
          >
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-4 sm:py-5 px-3 sm:px-5 pb-28 sm:pb-32">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 sm:mb-16">
          <div className="text-base sm:text-lg md:text-xl font-semibold text-[#023047]">Стъпка 1 от 4 - Кутия</div>
          <Link href="/" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-110 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[#023047] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Избери кутия
        </h2>

        {/* Discount Banner */}
        {hasDiscount && monthlyStandardPrice && (
          <div className="bg-gradient-to-r from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-3 sm:p-4 rounded-lg sm:rounded-xl mb-6 sm:mb-8">
            <p className="text-sm sm:text-base text-[#023047] font-semibold">
              🎉 Промо код <span className="text-[#FB7D00] font-bold">{promoCode}</span> е приложен – {monthlyStandardPrice.discountPercent}% отстъпка на всички кутии!
            </p>
          </div>
        )}

        {/* Subscription Types */}
        <div className="space-y-6 sm:space-y-8 md:space-y-10 mb-6 sm:mb-8 md:mb-10">
          {/* Monthly Subscription */}
          <div className="bg-white rounded-xl sm:rounded-[20px] p-4 sm:p-6 md:p-8 shadow-lg">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] mb-1 sm:mb-2">Месечна</h3>
            <p className="text-sm sm:text-base md:text-lg text-[#FB7D00] font-semibold uppercase tracking-wide mb-4 sm:mb-5 md:mb-6">Абонамент</p>
            
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
              {/* Standard */}
              <div
                onClick={() => handleSelect('monthly-standard')}
                className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'monthly-standard'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div
                  className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                    selected === 'monthly-standard' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'monthly-standard' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[#023047] mb-2 sm:mb-3 md:mb-4">Стандартна</h4>
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
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="absolute top-2 sm:top-2.5 right-11 sm:right-14 bg-[#FB7D00] text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[0.6rem] sm:text-[0.7rem] font-semibold uppercase tracking-wide">
                  Премиум
                </div>
                
                <div
                  className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                    selected === 'monthly-premium' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'monthly-premium' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[#023047] mb-2 sm:mb-3 md:mb-4">Премиум</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                  Получаваш всичко от стандартната кутия плюс <span className="text-[#FB7D00] font-bold">спортно облекло</span>
                </p>
                {monthlyPremiumPrice && <PriceDisplay priceInfo={monthlyPremiumPrice} />}
                
                {/* Frequency Selection */}
                <div className="pt-3 sm:pt-4 md:pt-5 mt-3 sm:mt-4 md:mt-5 border-t-2 border-gray-100">
                  <div className="text-sm sm:text-base font-semibold text-[#023047] mb-3 sm:mb-4">
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
                          ? 'bg-[#FB7D00] text-white border-[#FB7D00]'
                          : 'bg-white text-[#023047] border-gray-300 hover:border-[#FB7D00] hover:-translate-y-0.5'
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
                          ? 'bg-[#FB7D00] text-white border-[#FB7D00]'
                          : 'bg-white text-[#023047] border-gray-300 hover:border-[#FB7D00] hover:-translate-y-0.5'
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
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] mb-1 sm:mb-2">Еднократна</h3>
            <p className="text-sm sm:text-base md:text-lg text-[#FB7D00] font-semibold uppercase tracking-wide mb-4 sm:mb-5 md:mb-6">Без абонамент</p>
            
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
              {/* Standard */}
              <div
                onClick={() => handleSelect('onetime-standard')}
                className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 pt-7 sm:pt-8 md:pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'onetime-standard'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div
                  className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                    selected === 'onetime-standard' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'onetime-standard' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[#023047] mb-2 sm:mb-3 md:mb-4">Стандартна</h4>
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
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="absolute top-2 sm:top-2.5 right-11 sm:right-14 bg-[#FB7D00] text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[0.6rem] sm:text-[0.7rem] font-semibold uppercase tracking-wide">
                  Премиум
                </div>
                
                <div
                  className={`absolute top-2 sm:top-2.5 right-3 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-3 transition-all ${
                    selected === 'onetime-premium' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'onetime-premium' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-[#023047] mb-2 sm:mb-3 md:mb-4">Премиум</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                  Получаваш всичко от стандартната кутия плюс <span className="text-[#FB7D00] font-bold">спортно облекло</span>
                </p>
                {onetimePremiumPrice && <PriceDisplay priceInfo={onetimePremiumPrice} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 sm:py-4 px-3 sm:px-5">
        <div className="max-w-3xl mx-auto flex gap-2 sm:gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="bg-[#FB7D00] text-white px-8 sm:px-10 md:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            Напред
          </button>
        </div>
      </div>
    </div>
  );
}
