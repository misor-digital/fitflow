'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PriceDisplay from '@/components/PriceDisplay';
import { useOrderStore } from '@/store/orderStore';
import { trackViewContent, trackViewItem, trackCTAClick } from '@/lib/analytics';
import type { PricesMap, PriceInfo } from '@/lib/catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CycleInfo {
  id: string;
  deliveryDate: string;
  title: string | null;
  description: string | null;
}

interface CycleItemInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  sortOrder: number;
}

interface RevealedBoxContentProps {
  cycle: CycleInfo;
  items: CycleItemInfo[];
  prices: PricesMap;
  availableUntil: string; // formatted date
  monthYear: string;      // "Март 2026"
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string; emoji: string }> = {
  protein:     { label: 'Протеин',   color: 'text-green-700',  bgColor: 'bg-green-100',  emoji: '🏋️' },
  supplement:  { label: 'Добавка',   color: 'text-blue-700',   bgColor: 'bg-blue-100',   emoji: '💊' },
  accessory:   { label: 'Аксесоар',  color: 'text-orange-700', bgColor: 'bg-orange-100',  emoji: '🎒' },
  clothing:    { label: 'Облекло',   color: 'text-purple-700', bgColor: 'bg-purple-100',  emoji: '👕' },
  snack:       { label: 'Снак',      color: 'text-yellow-700', bgColor: 'bg-yellow-100',  emoji: '🍫' },
};

function getCategoryConfig(category: string | null) {
  if (!category) return { label: 'Продукт', color: 'text-gray-700', bgColor: 'bg-gray-100', emoji: '📦' };
  return CATEGORY_CONFIG[category] ?? { label: category, color: 'text-gray-700', bgColor: 'bg-gray-100', emoji: '📦' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevealedBoxContent({
  cycle,
  items,
  prices,
  availableUntil,
  monthYear,
}: RevealedBoxContentProps) {
  const router = useRouter();
  const hasTracked = useRef(false);
  const { promoCode } = useOrderStore();
  const [livePrices, setLivePrices] = useState<PricesMap>(prices);

  // Analytics on mount
  useEffect(() => {
    if (!hasTracked.current) {
      trackViewContent();
      trackViewItem({
        item_id: 'revealed-box',
        item_name: `Revealed Box ${monthYear}`,
      });
      hasTracked.current = true;
    }
  }, [monthYear]);

  // Refresh prices when promo code changes
  useEffect(() => {
    if (!promoCode) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/catalog?type=prices&promoCode=${encodeURIComponent(promoCode)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.prices) {
          setLivePrices(data.prices);
        }
      } catch {
        // keep current prices on error
      }
    })();

    return () => { cancelled = true; };
  }, [promoCode]);

  const onetimeStandard: PriceInfo | null = livePrices['onetime-standard'] || null;
  const onetimePremium: PriceInfo | null = livePrices['onetime-premium'] || null;
  const hasDiscount = promoCode && onetimeStandard && onetimeStandard.discountPercent > 0;

  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const nonClothingItems = sortedItems.filter((i) => i.category !== 'clothing');

  const handleOrderClick = (boxType: string) => {
    trackCTAClick({
      cta_text: 'Поръчай с бърза доставка',
      cta_location: 'revealed_box_page',
      destination: '/order',
    });
    const params = new URLSearchParams({
      boxType,
      orderType: 'onetime-revealed',
      cycleId: cycle.id,
    });
    router.push(`/order?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[var(--color-brand-orange)] to-[var(--color-brand-navy)] py-16 sm:py-20 md:py-28 px-4 sm:px-5 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(251,125,0,0.2),transparent_50%)]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-block mb-4 sm:mb-6">
            <span className="text-4xl sm:text-5xl md:text-6xl">🎁</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-wide">
            Кутия {monthYear}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 max-w-xl mx-auto">
            Вижте какво съдържа тазмесечната кутия!
          </p>
          {availableUntil && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold shadow-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Поръчай до {availableUntil} — бърза доставка!
            </div>
          )}
        </div>
      </section>

      {/* Items Gallery Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-b from-white to-gray-50">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-3 sm:mb-4 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Какво има в кутията
        </h2>
        <p className="text-center text-sm sm:text-base text-gray-500 mb-8 sm:mb-10 md:mb-12">
          Тази кутия съдържа {sortedItems.length} продукта
        </p>

        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
          {sortedItems.map((item) => {
            const cat = getCategoryConfig(item.category);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all border-2 border-transparent hover:border-[var(--color-brand-orange)]"
              >
                {/* Image or placeholder */}
                {item.imageUrl ? (
                  <div className="relative w-full aspect-square bg-gray-50">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl">{cat.emoji}</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-3 sm:p-4">
                  {/* Category badge */}
                  <span className={`inline-block text-[0.65rem] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${cat.bgColor} ${cat.color} mb-1.5 sm:mb-2`}>
                    {cat.label}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-brand-navy)] leading-tight">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cycle Description Section */}
      {cycle.description && (
        <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-6 sm:mb-8 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
              За тази кутия
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed text-center">
              {cycle.description.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-3 sm:mb-4 text-sm sm:text-base md:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing + CTA Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-b from-gray-50 to-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-3 sm:mb-4 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Поръчай сега
        </h2>
        <p className="text-center text-sm sm:text-base text-gray-500 mb-8 sm:mb-10 md:mb-12">
          Еднократна покупка — бърза доставка до 2-3 работни дни
        </p>

        {/* Discount Banner */}
        {hasDiscount && onetimeStandard && (
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-[var(--color-brand-orange)]/10 to-[var(--color-brand-orange)]/5 border-l-4 border-[var(--color-brand-orange)] p-3 sm:p-4 rounded-lg sm:rounded-xl mb-6 sm:mb-8">
            <p className="text-sm sm:text-base text-[var(--color-brand-navy)] font-semibold">
              🎉 Промо код <span className="text-[var(--color-brand-orange)] font-bold">{promoCode}</span> е приложен – {onetimeStandard.discountPercent}% отстъпка!
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Standard */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg border-2 border-gray-200 hover:border-[var(--color-brand-orange)] hover:-translate-y-1 hover:shadow-xl transition-all">
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3">Стандартна</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
              Включва: {nonClothingItems.length > 0 ? nonClothingItems.map((i) => i.name).join(', ') : `${sortedItems.length} продукта`}
            </p>
            {onetimeStandard && <PriceDisplay priceInfo={onetimeStandard} />}
            <button
              onClick={() => handleOrderClick('onetime-standard')}
              className="mt-5 sm:mt-6 w-full bg-[var(--color-brand-orange)] text-white py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Поръчай с бърза доставка
            </button>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg border-2 border-[var(--color-brand-orange)] relative hover:-translate-y-1 hover:shadow-xl transition-all">
            <div className="absolute top-3 right-3 bg-[var(--color-brand-orange)] text-white px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
              Премиум
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3">Премиум</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
              Включва всички продукти + спортно облекло
            </p>
            {onetimePremium && <PriceDisplay priceInfo={onetimePremium} />}
            <button
              onClick={() => handleOrderClick('onetime-premium')}
              className="mt-5 sm:mt-6 w-full bg-[var(--color-brand-orange)] text-white py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Поръчай с бърза доставка
            </button>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Често задавани въпроси
        </h2>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          <FAQItem
            question="Как се доставя?"
            answer="Тази кутия се изпраща веднага след поръчка — доставка до 2-3 работни дни."
          />
          <FAQItem
            question="Каква е разликата от мистериозната кутия?"
            answer={`Мистериозната кутия се доставя на следващата дата за абонаменти и съдържанието е изненада. Тази кутия съдържа вече разкритите продукти от ${monthYear} и се доставя бързо.`}
          />
          <FAQItem
            question="Не е нужна регистрация"
            answer="Можете да поръчате като гост — не е нужно да се регистрирате."
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#045a7f]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Хареса ли ти кутията?
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8">
            Поръчай сега — доставка до 2-3 работни дни!
          </p>
          <button
            onClick={() => handleOrderClick('onetime-standard')}
            className="bg-[var(--color-brand-orange)] text-white px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
          >
            Поръчай с бърза доставка
          </button>
        </div>
      </section>
    </div>
  );
}

/** FAQ accordion-style item */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-50 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left"
      >
        <span className="text-sm sm:text-base md:text-lg font-semibold text-[var(--color-brand-navy)] pr-4">
          {question}
        </span>
        <svg
          className={`w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-brand-orange)] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
