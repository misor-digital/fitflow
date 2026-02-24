'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PriceDisplay from '@/components/PriceDisplay';
import { useOrderStore } from '@/store/orderStore';
import { trackViewContent, trackViewItem, trackCTAClick } from '@/lib/analytics';
import type { PricesMap, PriceInfo } from '@/lib/catalog';

interface UpcomingCycleInfo {
  id: string;
  deliveryDate: string;
  title: string | null;
}

interface MysteryBoxContentProps {
  upcomingCycle: UpcomingCycleInfo | null;
  prices: PricesMap;
  nextDeliveryDate: string; // formatted DD.MM.YYYY
}

export default function MysteryBoxContent({
  upcomingCycle,
  prices,
  nextDeliveryDate,
}: MysteryBoxContentProps) {
  const router = useRouter();
  const hasTracked = useRef(false);
  const { promoCode } = useOrderStore();
  const [livePrices, setLivePrices] = useState<PricesMap>(prices);

  // Analytics on mount
  useEffect(() => {
    if (!hasTracked.current) {
      trackViewContent();
      trackViewItem({
        item_id: 'mystery-box',
        item_name: 'Mystery Box',
      });
      hasTracked.current = true;
    }
  }, []);

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

  const cycleId = upcomingCycle?.id ?? '';

  const handleOrderClick = (boxType: string) => {
    trackCTAClick({
      cta_text: 'Поръчай',
      cta_location: 'mystery_box_page',
      destination: '/order',
    });
    const params = new URLSearchParams({
      boxType,
      orderType: 'onetime-mystery',
      ...(cycleId ? { cycleId } : {}),
    });
    router.push(`/order?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[var(--color-brand-navy)] py-16 sm:py-20 md:py-28 px-4 sm:px-5 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,125,0,0.3),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(142,202,230,0.2),transparent_50%)]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-block mb-4 sm:mb-6">
            <span className="text-4xl sm:text-5xl md:text-6xl">🎁</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-wide">
            Мистериозна Кутия
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 max-w-xl mx-auto">
            Съдържанието е изненада до деня на доставката!
          </p>
          <div className="inline-flex items-center gap-2 bg-[var(--color-brand-orange)] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold shadow-lg">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Следваща доставка: {nextDeliveryDate}
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-b from-white to-gray-50">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Какво получаваш?
        </h2>
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
          {[
            { emoji: '🏋️', title: 'Протеинови продукти', badge: null },
            { emoji: '🎒', title: 'Спортни аксесоари', badge: null },
            { emoji: '💊', title: 'Добавки', badge: null },
            { emoji: '👕', title: 'Спортно облекло', badge: 'Premium' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all border-2 border-transparent hover:border-[var(--color-brand-orange)] relative">
              {item.badge && (
                <div className="absolute top-2 right-2 bg-[var(--color-brand-orange)] text-white px-2 py-0.5 rounded-full text-[0.6rem] sm:text-[0.7rem] font-semibold uppercase tracking-wide">
                  {item.badge}
                </div>
              )}
              <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3">{item.emoji}</div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-[var(--color-brand-navy)]">{item.title}</h3>
            </div>
          ))}
        </div>
        <p className="text-center text-sm sm:text-base text-gray-600 mt-6 sm:mt-8 max-w-lg mx-auto">
          Конкретните продукти остават тайна — ще бъдат разкрити на <span className="font-semibold text-[var(--color-brand-navy)]">{nextDeliveryDate}</span>!
        </p>
      </section>

      {/* Pricing Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-3 sm:mb-4 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Избери своята кутия
        </h2>
        <p className="text-center text-sm sm:text-base text-gray-500 mb-8 sm:mb-10 md:mb-12">
          Еднократна покупка — без абонамент
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
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5">
              4-5 продукта за активни дами
            </p>
            {onetimeStandard && <PriceDisplay priceInfo={onetimeStandard} />}
            <button
              onClick={() => handleOrderClick('onetime-standard')}
              className="mt-5 sm:mt-6 w-full bg-[var(--color-brand-orange)] text-white py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Поръчай
            </button>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg border-2 border-[var(--color-brand-orange)] relative hover:-translate-y-1 hover:shadow-xl transition-all">
            <div className="absolute top-3 right-3 bg-[var(--color-brand-orange)] text-white px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
              Премиум
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-brand-navy)] mb-2 sm:mb-3">Премиум</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5">
              6-8 продукта + спортно облекло
            </p>
            {onetimePremium && <PriceDisplay priceInfo={onetimePremium} />}
            <button
              onClick={() => handleOrderClick('onetime-premium')}
              className="mt-5 sm:mt-6 w-full bg-[var(--color-brand-orange)] text-white py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Поръчай
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-b from-gray-50 to-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Как работи
        </h2>
        <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
          {[
            { num: 1, title: 'Избери кутия', desc: 'Стандартна или Премиум — според предпочитанията ти' },
            { num: 2, title: 'Сподели предпочитания', desc: 'Персонализацията помага да подберем продуктите за теб' },
            { num: 3, title: `Получи на ${nextDeliveryDate}`, desc: 'Доставяме заедно с абонаментните кутии' },
          ].map((step) => (
            <div key={step.num} className="relative bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-lg border-l-4 border-[var(--color-brand-orange)] hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="absolute -top-3 sm:-top-4 left-4 sm:left-5 w-10 h-10 sm:w-12 sm:h-12 bg-[var(--color-brand-orange)] text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg">
                {step.num}
              </div>
              <div className="mt-3 sm:mt-4">
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-brand-navy)] mb-1 sm:mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Често задавани въпроси
        </h2>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          <FAQItem
            question="Как се различава от абонамента?"
            answer="Абонаментът се доставя всеки месец автоматично. Мистериозната кутия е еднократна покупка, доставена на следващата дата за абонаменти."
          />
          <FAQItem
            question="Кога ще знам какво има вътре?"
            answer={`Съдържанието ще бъде разкрито на ${nextDeliveryDate} след доставката.`}
          />
          <FAQItem
            question="Мога ли да поръчам като гост?"
            answer="Да, не е нужна регистрация за еднократни покупки."
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#045a7f]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Готова ли си за изненадата?
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8">
            Поръчай мистериозна кутия и получи на {nextDeliveryDate}
          </p>
          <Link
            href={`/order?boxType=onetime-standard${cycleId ? `&cycleId=${cycleId}` : ''}&orderType=onetime-mystery`}
            onClick={() => trackCTAClick({ cta_text: 'Поръчай сега', cta_location: 'mystery_box_bottom_cta', destination: '/order' })}
          >
            <button className="bg-[var(--color-brand-orange)] text-white px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
              Поръчай сега
            </button>
          </Link>
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
