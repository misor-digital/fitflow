'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStore, usePreorderInput } from '@/store/formStore';
import Link from 'next/link';
import type { PriceInfo } from '@/lib/preorder';
import { 
  formatPrice, 
  transformToApiRequest,
} from '@/lib/preorder';

interface CatalogData {
  boxTypeNames: Record<string, string>;
  labels: {
    sports: Record<string, string>;
    colors: Record<string, string>;
    flavors: Record<string, string>;
    dietary: Record<string, string>;
  };
}

export default function Step4() {
  const router = useRouter();
  const store = useFormStore();
  const userInput = usePreorderInput();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Catalog data from API
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch catalog data and prices from API
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch catalog data
        const catalogResponse = await fetch('/api/catalog?type=all');
        if (!catalogResponse.ok) {
          throw new Error('Failed to fetch catalog');
        }
        const catalog = await catalogResponse.json();
        setCatalogData(catalog);
        
        // Fetch prices with promo code
        if (store.boxType) {
          const priceUrl = store.promoCode 
            ? `/api/catalog?type=prices&promoCode=${encodeURIComponent(store.promoCode)}`
            : '/api/catalog?type=prices';
          
          const priceResponse = await fetch(priceUrl);
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            if (priceData.prices && priceData.prices[store.boxType]) {
              setPriceInfo(priceData.prices[store.boxType]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [store.boxType, store.promoCode]);

  // Get labels from catalog data (no fallbacks - DB is source of truth)
  const BOX_TYPES = catalogData?.boxTypeNames ?? {};
  const sportLabels = catalogData?.labels?.sports ?? {};
  const colorLabels = catalogData?.labels?.colors ?? {};
  const flavorLabels = catalogData?.labels?.flavors ?? {};
  const dietaryLabels = catalogData?.labels?.dietary ?? {};

  const hasDiscount = priceInfo && priceInfo.discountPercent > 0;

  const handleBack = () => {
    router.push('/step-3');
  };

  const handleFinalSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Use shared transform function to build API request
      const formData = transformToApiRequest(userInput);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white py-4 sm:py-5 px-3 sm:px-5 pb-28 sm:pb-32">
      <div className="max-w-3xl mx-auto mt-12 sm:mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 sm:mb-16">
          <div className="text-base sm:text-lg md:text-xl font-semibold text-[#023047]">Стъпка 4 от 4 - Финализиране</div>
          <Link href="/" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#023047] italic hover:text-[#FB7D00] hover:scale-150 transition-all duration-300">
            FitFlow
          </Link>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[#023047] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Преглед на поръчката
        </h2>

        {/* Summary Cards */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-8 md:mb-10">
          {/* Box Type */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[#023047] mb-3 sm:mb-4 border-b pb-2">Избрана кутия</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
              <div>
                <div className="text-base sm:text-lg font-semibold text-[#023047]">
                  {store.boxType && (BOX_TYPES[store.boxType] || store.boxType)}
                </div>
              </div>
              {priceInfo && (
                <div className="text-left sm:text-right">
                  {hasDiscount ? (
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="text-xs sm:text-sm text-gray-400 line-through">
                        {formatPrice(priceInfo.originalPriceBgn)} лв / {formatPrice(priceInfo.originalPriceEur)} €
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-[#FB7D00]">
                        {formatPrice(priceInfo.finalPriceBgn)} лв / {formatPrice(priceInfo.finalPriceEur)} €
                      </div>
                    </div>
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-[#FB7D00]">
                      {formatPrice(priceInfo.originalPriceBgn)} лв / {formatPrice(priceInfo.originalPriceEur)} €
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Promo Code Applied Note */}
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
                  Спестяваш {formatPrice(priceInfo.discountAmountBgn)} лв / {formatPrice(priceInfo.discountAmountEur)} €
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[#023047] mb-3 sm:mb-4 border-b pb-2">Лични данни</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[#023047]">Име:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600">{store.fullName}</span>
              </div>
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[#023047]">Email:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600 break-all">{store.email}</span>
              </div>
              {store.phone && (
                <div className="text-sm sm:text-base">
                  <span className="font-semibold text-[#023047]">Телефон:</span>
                  <span className="ml-1.5 sm:ml-2 text-gray-600">{store.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          {store.wantsPersonalization ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[#023047] mb-3 sm:mb-4 border-b pb-2">Предпочитания</h3>
              <div className="space-y-3 sm:space-y-4">
                {store.sports.length > 0 && (
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-[#023047] mb-0.5 sm:mb-1">Спорт:</div>
                    <div className="text-sm sm:text-base text-gray-600">
                      {store.sports.map(s => sportLabels[s] || s).join(', ')}
                      {store.sports.includes('other') && store.sportOther && ` (${store.sportOther})`}
                    </div>
                  </div>
                )}
                {store.colors.length > 0 && (
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-[#023047] mb-1.5 sm:mb-2">Цветове:</div>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {store.colors.map(c => (
                        <div key={c} title={colorLabels[c] || c} className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
                {store.flavors.length > 0 && (
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-[#023047] mb-0.5 sm:mb-1">Вкусове:</div>
                    <div className="text-sm sm:text-base text-gray-600">
                      {store.flavors.map(f => flavorLabels[f] || f).join(', ')}
                      {store.flavors.includes('other') && store.flavorOther && ` (${store.flavorOther})`}
                    </div>
                  </div>
                )}
                {store.dietary.length > 0 && (
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-[#023047] mb-0.5 sm:mb-1">Хранителни ограничения:</div>
                    <div className="text-sm sm:text-base text-gray-600">
                      {store.dietary.map(d => dietaryLabels[d] || d).join(', ')}
                      {store.dietary.includes('other') && store.dietaryOther && ` (${store.dietaryOther})`}
                    </div>
                  </div>
                )}
                {store.additionalNotes && store.additionalNotes.trim() !== '' && (
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-[#023047] mb-0.5 sm:mb-1">Допълнителни бележки:</div>
                    <div className="text-sm sm:text-base text-gray-600">{store.additionalNotes}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-[#023047] mb-3 sm:mb-4 border-b pb-2">Персонализация</h3>
              <p className="text-sm sm:text-base text-gray-600">Оставям избора на вас</p>
            </div>
          )}

          {/* Sizes */}
          {store.sizeLower && store.sizeUpper && (<div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[#023047] mb-3 sm:mb-4 border-b pb-2">Размери</h3>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[#023047]">Горна част:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600">{store.sizeUpper}</span>
              </div>
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-[#023047]">Долна част:</span>
                <span className="ml-1.5 sm:ml-2 text-gray-600">{store.sizeLower}</span>
              </div>
            </div>
          </div>)}
          
        </div>

        {/* Confirmation Message */}
        <div className="bg-gradient-to-br from-[#FB7D00]/10 to-[#FB7D00]/5 border-l-4 border-[#FB7D00] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 md:mb-10">
          <p className="text-sm sm:text-base md:text-lg text-[#023047] leading-relaxed text-center font-semibold">
            Моля, прегледай внимателно информацията по-горе. След натискане на &quot;Потвърди и изпрати&quot;, твоята предварителна поръчка ще бъде записана и ще получиш потвърждение на имейла си.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 sm:py-4 px-3 sm:px-5">
        <div className="max-w-3xl mx-auto flex gap-2 sm:gap-4 justify-center">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="bg-gray-300 text-[#023047] px-4 sm:px-6 md:px-10 py-3 sm:py-4 rounded-full text-xs sm:text-sm md:text-lg font-semibold uppercase tracking-wide hover:bg-gray-400 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            Назад
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="bg-[#FB7D00] text-white px-4 sm:px-6 md:px-12 py-3 sm:py-4 rounded-full text-xs sm:text-sm md:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Изпращане...' : 'Потвърди и изпрати'}
          </button>
        </div>
      </div>
    </div>
  );
}
