'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import { calculatePriceSync } from '@/lib/promo';
import PriceDisplay from '@/components/PriceDisplay';
import Link from 'next/link';

export default function Step1() {
  const router = useRouter();
  const { boxType, setBoxType, promoCode, discountPercent } = useFormStore();
  
  // Initialize selected state - normalize premium variants to 'monthly-premium'
  const getInitialSelected = (): string | null => {
    if (boxType === 'monthly-premium-monthly' || boxType === 'monthly-premium-seasonal') {
      return 'monthly-premium';
    }
    return boxType;
  };
  
  const [selected, setSelected] = useState<string | null>(getInitialSelected());
  
  // Initialize premium frequency based on stored boxType
  const getInitialFrequency = (): 'monthly' | 'seasonal' => {
    if (boxType === 'monthly-premium-seasonal') return 'seasonal';
    return 'monthly';
  };
  
  const [premiumFrequency, setPremiumFrequency] = useState<'monthly' | 'seasonal'>(getInitialFrequency());

  // Calculate prices for all box types using sync function with discountPercent from store
  const monthlyStandardPrice = calculatePriceSync('monthly-standard', discountPercent);
  const monthlyPremiumPrice = calculatePriceSync('monthly-premium', discountPercent);
  const onetimeStandardPrice = calculatePriceSync('onetime-standard', discountPercent);
  const onetimePremiumPrice = calculatePriceSync('onetime-premium', discountPercent);

  const hasDiscount = promoCode && discountPercent > 0;

  const handleSelect = (id: string) => {
    setSelected(id);
    
    // Handle premium frequency selection
    if (id === 'monthly-premium') {
      const finalSelection = `${id}-${premiumFrequency}` as typeof boxType;
      setBoxType(finalSelection);
    } else {
      setBoxType(id as typeof boxType);
    }
  };

  const handleFrequencySelect = (frequency: 'monthly' | 'seasonal') => {
    setPremiumFrequency(frequency);
    
    // Always select the premium box and update with frequency
    setSelected('monthly-premium');
    const finalSelection = `monthly-premium-${frequency}` as typeof boxType;
    setBoxType(finalSelection);
  };

  const handleContinue = () => {
    if (selected) {
      router.push('/step-2');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 pb-32">
      <div className="max-w-[900px] mx-auto mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div className="text-xl font-semibold text-[#023047]">Стъпка 1 от 4 - Кутия</div>
          <Link href="/" className="text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-110 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Избери кутия
        </h2>

        {/* Discount Banner */}
        {hasDiscount && (
          <div className="bg-gradient-to-r from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-4 rounded-xl mb-8">
            <p className="text-[#023047] font-semibold">
              🎉 Промо код <span className="text-[#FB7D00] font-bold">{promoCode}</span> е приложен – {discountPercent}% отстъпка на всички кутии!
            </p>
          </div>
        )}

        {/* Subscription Types */}
        <div className="space-y-10 mb-10">
          {/* Monthly Subscription */}
          <div className="bg-white rounded-[20px] p-8 shadow-lg">
            <h3 className="text-3xl font-bold text-[#023047] mb-2">Месечна</h3>
            <p className="text-lg text-[#FB7D00] font-semibold uppercase tracking-wide mb-6">Абонамент</p>
            
            <div className="grid md:grid-cols-2 gap-5">
              {/* Standard */}
              <div
                onClick={() => handleSelect('monthly-standard')}
                className={`bg-white rounded-2xl p-6 pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'monthly-standard'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div
                  className={`absolute top-2.5 right-4 w-6 h-6 rounded-full border-3 transition-all ${
                    selected === 'monthly-standard' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'monthly-standard' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-2xl font-bold text-[#023047] mb-4">Стандартна</h4>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Получаваш кутия с 4-6 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари
                </p>
                <PriceDisplay priceInfo={monthlyStandardPrice} />
              </div>

              {/* Premium */}
              <div
                onClick={() => handleSelect('monthly-premium')}
                className={`bg-white rounded-2xl p-6 pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'monthly-premium'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="absolute top-2.5 right-14 bg-[#FB7D00] text-white px-2.5 py-1 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide">
                  Премиум
                </div>
                
                <div
                  className={`absolute top-2.5 right-4 w-6 h-6 rounded-full border-3 transition-all ${
                    selected === 'monthly-premium' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'monthly-premium' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-2xl font-bold text-[#023047] mb-4">Премиум</h4>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Получаваш всичко от стандартната кутия плюс <span className="text-[#FB7D00] font-bold">спортно облекло</span>
                </p>
                <PriceDisplay priceInfo={monthlyPremiumPrice} />
                
                {/* Frequency Selection */}
                <div className="pt-5 mt-5 border-t-2 border-gray-100">
                  <div className="text-base font-semibold text-[#023047] mb-4">
                    Колко често искаш да получаваш кутията?
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFrequencySelect('monthly');
                      }}
                      className={`flex-1 py-3 px-5 border-2 rounded-xl font-semibold text-sm transition-all ${
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
                      className={`flex-1 py-3 px-5 border-2 rounded-xl font-semibold text-sm transition-all ${
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
          <div className="bg-white rounded-[20px] p-8 shadow-lg">
            <h3 className="text-3xl font-bold text-[#023047] mb-2">Еднократна</h3>
            <p className="text-lg text-[#FB7D00] font-semibold uppercase tracking-wide mb-6">Без абонамент</p>
            
            <div className="grid md:grid-cols-2 gap-5">
              {/* Standard */}
              <div
                onClick={() => handleSelect('onetime-standard')}
                className={`bg-white rounded-2xl p-6 pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'onetime-standard'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div
                  className={`absolute top-2.5 right-4 w-6 h-6 rounded-full border-3 transition-all ${
                    selected === 'onetime-standard' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'onetime-standard' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-2xl font-bold text-[#023047] mb-4">Стандартна</h4>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Получаваш кутия с 4-6 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари
                </p>
                <PriceDisplay priceInfo={onetimeStandardPrice} />
              </div>

              {/* Premium */}
              <div
                onClick={() => handleSelect('onetime-premium')}
                className={`bg-white rounded-2xl p-6 pt-9 shadow-md cursor-pointer transition-all border-3 relative ${
                  selected === 'onetime-premium'
                    ? 'border-[#FB7D00] bg-gradient-to-br from-[#FB7D00]/5 to-[#FB7D00]/2'
                    : 'border-gray-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="absolute top-2.5 right-14 bg-[#FB7D00] text-white px-2.5 py-1 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide">
                  Премиум
                </div>
                
                <div
                  className={`absolute top-2.5 right-4 w-6 h-6 rounded-full border-3 transition-all ${
                    selected === 'onetime-premium' ? 'border-[#FB7D00]' : 'border-gray-300'
                  }`}
                >
                  {selected === 'onetime-premium' && (
                    <div className="w-full h-full rounded-full bg-[#FB7D00] scale-[0.5]" />
                  )}
                </div>
                
                <h4 className="text-2xl font-bold text-[#023047] mb-4">Премиум</h4>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Получаваш всичко от стандартната кутия плюс <span className="text-[#FB7D00] font-bold">спортно облекло</span>
                </p>
                <PriceDisplay priceInfo={onetimePremiumPrice} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-5">
        <div className="max-w-3xl mx-auto flex gap-4 justify-center">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-[#023047] px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all"
          >
            Назад
          </button>
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="bg-[#FB7D00] text-white px-12 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            Напред
          </button>
        </div>
      </div>
    </div>
  );
}
