'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore } from '@/store/formStore';
import Link from 'next/link';
import type { AppliedDiscount } from '@/lib/promo';

const BOX_TYPES: Record<string, { name: string; price: string; priceBGN: number }> = {
  'monthly-standard': { name: 'Месечна - Стандартна', price: '48.70 лв / 24.90 €', priceBGN: 48.70 },
  'monthly-premium-monthly': { name: 'Месечна - Премиум (всеки месец)', price: '68.26 лв / 34.90 €', priceBGN: 68.26 },
  'monthly-premium-seasonal': { name: 'Месечна - Премиум (всеки 3 месеца)', price: '68.26 лв / 34.90 €', priceBGN: 68.26 },
  'onetime-standard': { name: 'Еднократна - Стандартна', price: '58.48 лв / 29.90 €', priceBGN: 58.48 },
  'onetime-premium': { name: 'Еднократна - Премиум', price: '78.04 лв / 39.90 €', priceBGN: 78.04 },
};

const SPORT_LABELS: Record<string, string> = {
  'fitness': 'Фитнес',
  'dance': 'Танци',
  'yoga': 'Йога/пилатес',
  'running': 'Бягане',
  'swimming': 'Плуване',
  'team': 'Отборен спорт',
  'other': 'Други'
};

const FLAVOR_LABELS: Record<string, string> = {
  'chocolate': 'Шоколад',
  'strawberry': 'Ягода',
  'vanilla': 'Ванилия',
  'salted-caramel': 'Солен карамел',
  'biscuit': 'Бисквита',
  'other': 'Други'
};

const DIETARY_LABELS: Record<string, string> = {
  'none': 'Не',
  'lactose': 'Без лактоза',
  'gluten': 'Без глутен',
  'vegan': 'Веган',
  'other': 'Други'
};

const COLOR_NAMES: Record<string, string> = {
  '#000000': 'Черно',
  '#FFFFFF': 'Бяло',
  '#8A8A8A': 'Сиво',
  '#0A1A33': 'Тъмно синьо',
  '#7EC8E3': 'Светло синьо',
  '#F4C2C2': 'Розово',
  '#8d010d': 'Бордо',
  '#B497D6': 'Лилаво',
  '#556B2F': 'Маслинено зелено',
  '#FB7D00': 'Оранжево'
};

// BGN to EUR conversion rate (approximate)
const BGN_TO_EUR = 0.51;

export default function Step4() {
  const router = useRouter();
  const store = useFormStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState(store.promoCode || '');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(!!store.appliedDiscount);
  const [isValidating, setIsValidating] = useState(false);

  const handleBack = () => {
    router.push('/step-3');
  };

  // Calculate prices
  const boxInfo = store.boxType ? BOX_TYPES[store.boxType] : null;
  const originalPrice = boxInfo?.priceBGN ?? 0;
  const discountAmount = store.appliedDiscount?.discountAmount ?? 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  const finalPriceEUR = (finalPrice * BGN_TO_EUR).toFixed(2);

  // Validate promo code
  const validatePromoCode = useCallback(async () => {
    if (!promoCodeInput.trim()) {
      // Clear any applied discount if input is empty
      store.setPromoCode('');
      store.setAppliedDiscount(null);
      setPromoError('');
      setPromoSuccess(false);
      return;
    }

    if (!store.boxType) {
      setPromoError('Моля, първо изберете тип кутия');
      return;
    }

    setIsValidating(true);
    setPromoError('');
    setPromoSuccess(false);

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          boxType: store.boxType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setPromoError(result.error || 'Грешка при валидиране');
        store.setPromoCode('');
        store.setAppliedDiscount(null);
        return;
      }

      if (!result.valid) {
        setPromoError(result.error || 'Невалиден промо код');
        store.setPromoCode('');
        store.setAppliedDiscount(null);
        return;
      }

      // Success - apply discount
      if (result.discount) {
        store.setPromoCode(promoCodeInput.trim().toUpperCase());
        store.setAppliedDiscount(result.discount as AppliedDiscount);
        setPromoSuccess(true);
      } else {
        // Valid but no discount (empty code)
        store.setPromoCode('');
        store.setAppliedDiscount(null);
      }
    } catch (err) {
      console.error('Error validating promo code:', err);
      setPromoError('Грешка при валидиране на промо кода');
      store.setPromoCode('');
      store.setAppliedDiscount(null);
    } finally {
      setIsValidating(false);
    }
  }, [promoCodeInput, store]);

  // Remove applied promo code
  const removePromoCode = () => {
    setPromoCodeInput('');
    store.setPromoCode('');
    store.setAppliedDiscount(null);
    setPromoSuccess(false);
    setPromoError('');
  };

  const handleFinalSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const formData = {
        fullName: store.fullName,
        email: store.email,
        phone: store.phone,
        boxType: store.boxType,
        wantsPersonalization: store.wantsPersonalization,
        preferences: store.wantsPersonalization ? {
          sports: store.sports,
          sportOther: store.sportOther,
          colors: store.colors,
          dietary: store.dietary,
          dietaryOther: store.dietaryOther,
          flavors: store.flavors,
          flavorOther: store.flavorOther,
          additionalNotes: store.additionalNotes,
        } : null,
        sizes: {
          upper: store.sizeUpper,
          lower: store.sizeLower,
        },
        // Include promo code and discount info
        promoCode: store.promoCode || null,
        discount: store.appliedDiscount ? {
          code: store.appliedDiscount.code,
          discountType: store.appliedDiscount.discountType,
          discountValue: store.appliedDiscount.discountValue,
          discountAmount: store.appliedDiscount.discountAmount,
          description: store.appliedDiscount.description,
        } : null,
      };

      const response = await fetch('/api/preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      // Redirect to thank you page on success
      router.push('/thank-you/preorder');
    } catch (err) {
      setError('Възникна грешка. Моля, опитайте отново.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-5 px-5 pb-32">
      <div className="max-w-3xl mx-auto mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div className="text-xl font-semibold text-[#023047]">Стъпка 4 от 4 - Финализиране</div>
          <Link href="/" className="text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Преглед на поръчката
        </h2>

        {/* Summary Cards */}
        <div className="space-y-6 mb-10">
          {/* Box Type */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Избрана кутия</h3>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold text-[#023047]">
                  {store.boxType && BOX_TYPES[store.boxType]?.name || 'Не е избрана'}
                </div>
              </div>
              <div className="text-right">
                {store.appliedDiscount ? (
                  <div>
                    <div className="text-lg text-gray-400 line-through">
                      {store.boxType && BOX_TYPES[store.boxType]?.price || '-'}
                    </div>
                    <div className="text-2xl font-bold text-[#FB7D00]">
                      {finalPrice.toFixed(2)} лв / {finalPriceEUR} €
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-[#FB7D00]">
                    {store.boxType && BOX_TYPES[store.boxType]?.price || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Promo Code Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Промо код (по избор)</h3>
            
            {store.appliedDiscount ? (
              // Show applied discount
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold text-lg">✓ {store.appliedDiscount.code}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                        {store.appliedDiscount.description}
                      </span>
                    </div>
                    <div className="text-green-600 mt-1">
                      Отстъпка: -{store.appliedDiscount.discountAmount.toFixed(2)} лв.
                    </div>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-gray-500 hover:text-red-500 transition-colors p-2"
                    title="Премахни промо код"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              // Show promo code input
              <div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    placeholder="Въведи промо код"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#FB7D00] focus:outline-none transition-colors text-[#023047] font-medium uppercase"
                    disabled={isValidating}
                  />
                  <button
                    onClick={validatePromoCode}
                    disabled={isValidating || !promoCodeInput.trim()}
                    className="bg-[#023047] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#034a6e] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    ) : (
                      'Приложи'
                    )}
                  </button>
                </div>
                
                {promoError && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {promoError}
                  </div>
                )}
                
                <p className="text-gray-500 text-sm mt-3">
                  Имаш промо код? Въведи го тук за отстъпка от поръчката.
                </p>
              </div>
            )}
          </div>

          {/* Order Total with Discount */}
          {store.appliedDiscount && (
            <div className="bg-gradient-to-r from-[#FB7D00]/10 to-[#FB7D00]/5 rounded-2xl p-6 shadow-lg border-2 border-[#FB7D00]/20">
              <h3 className="text-xl font-bold text-[#023047] mb-4">Обобщение на цената</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Цена на кутията:</span>
                  <span>{originalPrice.toFixed(2)} лв.</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Отстъпка ({store.appliedDiscount.code}):</span>
                  <span>-{discountAmount.toFixed(2)} лв.</span>
                </div>
                <div className="border-t border-[#FB7D00]/30 pt-2 mt-2">
                  <div className="flex justify-between text-[#023047] font-bold text-xl">
                    <span>Крайна цена:</span>
                    <span className="text-[#FB7D00]">{finalPrice.toFixed(2)} лв. / {finalPriceEUR} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Лични данни</h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-[#023047]">Име:</span>
                <span className="ml-2 text-gray-600">{store.fullName}</span>
              </div>
              <div>
                <span className="font-semibold text-[#023047]">Email:</span>
                <span className="ml-2 text-gray-600">{store.email}</span>
              </div>
              {store.phone && (
                <div>
                  <span className="font-semibold text-[#023047]">Телефон:</span>
                  <span className="ml-2 text-gray-600">{store.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          {store.wantsPersonalization ? (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Предпочитания</h3>
              <div className="space-y-4">
                {store.sports.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Спорт:</div>
                    <div className="text-gray-600">
                      {store.sports.map(s => SPORT_LABELS[s] || s).join(', ')}
                      {store.sports.includes('other') && store.sportOther && ` (${store.sportOther})`}
                    </div>
                  </div>
                )}
                {store.colors.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-2">Цветове:</div>
                    <div className="flex gap-2 flex-wrap">
                      {store.colors.map(c => (
                        <div key={c} title={COLOR_NAMES[c]} className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
                {store.flavors.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Вкусове:</div>
                    <div className="text-gray-600">
                      {store.flavors.map(f => FLAVOR_LABELS[f] || f).join(', ')}
                      {store.flavors.includes('other') && store.flavorOther && ` (${store.flavorOther})`}
                    </div>
                  </div>
                )}
                {store.dietary.length > 0 && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Хранителни ограничения:</div>
                    <div className="text-gray-600">
                      {store.dietary.map(d => DIETARY_LABELS[d] || d).join(', ')}
                      {store.flavors.includes('other') && store.dietaryOther && ` (${store.dietaryOther})`}
                    </div>
                  </div>
                )}
                {store.additionalNotes && store.additionalNotes.trim() !== '' && (
                  <div>
                    <div className="font-semibold text-[#023047] mb-1">Допълнителни бележки:</div>
                    <div className="text-gray-600">{store.additionalNotes}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Персонализация</h3>
              <p className="text-gray-600">Оставям избора на вас</p>
            </div>
          )}

          {/* Sizes */}
          {store.sizeLower && store.sizeUpper && (<div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-[#023047] mb-4 border-b pb-2">Размери</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-[#023047]">Горна част:</span>
                <span className="ml-2 text-gray-600">{store.sizeUpper}</span>
              </div>
              <div>
                <span className="font-semibold text-[#023047]">Долна част:</span>
                <span className="ml-2 text-gray-600">{store.sizeLower}</span>
              </div>
            </div>
          </div>)}
          
        </div>

        {/* Confirmation Message */}
        <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-8 rounded-2xl shadow-lg mb-10">
          <p className="text-lg text-[#023047] leading-relaxed text-center font-semibold">
            Моля, прегледай внимателно информацията по-горе. След натискане на &quot;Потвърди и изпрати&quot;, твоята предварителна поръчка ще бъде записана и ще получиш потвърждение на имейла си.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-5">
        <div className="max-w-3xl mx-auto flex gap-4 justify-center">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="bg-gray-300 text-[#023047] px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            Назад
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="bg-[#FB7D00] text-white px-12 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Изпращане...' : 'Потвърди и изпрати'}
          </button>
        </div>
      </div>
    </div>
  );
}
