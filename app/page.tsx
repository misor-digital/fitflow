'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense, Fragment, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HowItWorks from '@/components/HowItWorks';
import { useOrderStore } from '@/store/orderStore';
import { useDeliveryStore } from '@/store/deliveryStore';
import { trackViewContent, trackViewItem, trackCTAClick, trackPromoCode } from '@/lib/analytics';
import { formatDeliveryDate, formatMonthYear } from '@/lib/delivery';
import { formatPrice } from '@/lib/catalog';
import type { PricesMap } from '@/lib/catalog';

function HomeContent() {
  const searchParams = useSearchParams();
  const { setPromoCode } = useOrderStore();
  const hasTrackedViewContent = useRef(false);
  const {
    revealedBox: rawRevealedBox, fetchRevealedBox,
    upcomingDelivery, fetchUpcomingDelivery,
  } = useDeliveryStore();

  // Fetch box prices from catalog API
  const [boxPrices, setBoxPrices] = useState<PricesMap>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/catalog?type=prices');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.prices) {
          setBoxPrices(data.prices);
        }
      } catch {
        // keep empty on error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derive display-ready revealed box with formatted monthYear
  const revealedBox = useMemo(() => {
    if (!rawRevealedBox?.cycle) return null;
    return {
      cycle: rawRevealedBox.cycle,
      items: rawRevealedBox.items || [],
      monthYear: formatMonthYear(rawRevealedBox.cycle.deliveryDate),
    };
  }, [rawRevealedBox]);
  
  // Track ViewContent (Meta) and view_item (GA4) on landing page load (once)
  useEffect(() => {
    if (!hasTrackedViewContent.current) {
      // Meta Pixel
      trackViewContent();
      // GA4
      trackViewItem({
        item_id: 'fitflow-box',
        item_name: 'FitFlow Box',
      });
      hasTrackedViewContent.current = true;
    }
  }, []);
  
  // Extract promo code from URL and validate via API
  // Fix P3: Only validate if URL code differs from stored code
  useEffect(() => {
    async function validateAndSetPromo() {
      const urlPromoCode = searchParams.get('promocode');
      const storedCode = useOrderStore.getState().promoCode;
      if (urlPromoCode && urlPromoCode !== storedCode) {
        try {
          const response = await fetch(`/api/promo/validate?code=${encodeURIComponent(urlPromoCode)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setPromoCode(data.code);
              // Track successful promo code from URL
              trackPromoCode({
                promo_code: data.code,
                success: true,
                discount_percent: data.discountPercent,
              });
            } else {
              // Track invalid promo code attempt
              trackPromoCode({
                promo_code: urlPromoCode,
                success: false,
              });
            }
          }
        } catch (err) {
          console.error('Error validating promo code:', err);
        }
      }
    }
    
    validateAndSetPromo();
  }, [searchParams, setPromoCode]);

  // Fetch upcoming delivery date via shared store (deduped + cached)
  useEffect(() => {
    fetchUpcomingDelivery();
  }, [fetchUpcomingDelivery]);

  // Derive formatted delivery date from store
  const nextDeliveryDate = useMemo(() => {
    if (!upcomingDelivery?.nextDeliveryDate) return null;
    return formatDeliveryDate(upcomingDelivery.nextDeliveryDate);
  }, [upcomingDelivery]);

  // Fetch revealed box data via shared store (deduped with Navigation)
  useEffect(() => {
    fetchRevealedBox();
  }, [fetchRevealedBox]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section
          className="relative flex flex-col overflow-hidden h-[100dvh]"
          style={{
            background:
              'linear-gradient(165deg, #6B1D3A 0%, #4A1838 20%, #1E2D45 45%, #023047 70%, #011a28 100%)',
          }}
        >
        {/* Warm magenta glow upper area - matches hero_web.jpg lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 45% 25%, rgba(139,34,82,0.45) 0%, transparent 70%), radial-gradient(ellipse 40% 35% at 50% 45%, rgba(251,125,0,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Hero image - full viewport cover */}
        <div className="absolute inset-0 z-10">
          {/* Portrait viewport: tall hero */}
          <Image
            src="/storage/hero-portrait.png"
            alt="FitFlow кутия с фитнес продукти"
            fill
            quality={100}
            className="object-cover hero-portrait"
            priority
            sizes="100vw"
          />
          {/* Landscape viewport: wide hero */}
          <Image
            src="/storage/hero-landscape.png"
            alt="FitFlow кутия с фитнес продукти"
            fill
            quality={100}
            className="object-cover hero-landscape"
            style={{ objectPosition: 'var(--hero-pos, left center)' }}
            priority
            sizes="100vw"
          />
        </div>

        {/* Bottom fade - contrast behind text (desktop only, mobile uses stacked layout) */}
        <div
          className="absolute inset-x-0 bottom-0 h-[45%] sm:h-[40%] z-20 pointer-events-none hidden sm:block"
          style={{
            background:
              'linear-gradient(to top, rgba(2,48,71,0.95) 0%, rgba(2,48,71,0.5) 50%, transparent 100%)',
          }}
        />

        {/* Text & CTA - bottom-center in portrait, center-right in landscape */}
        <div className="relative z-30 flex-1 flex items-end justify-center px-4 pb-6 hero-cta-wrapper">
          <div className="w-full hero-cta-box bg-[var(--color-brand-navy)]/35 backdrop-blur-[6px] rounded-2xl px-4 py-4 text-center">
            <h1 className="text-2xl hero-cta-heading font-bold text-white mb-1.5 tracking-wide leading-tight">
              <span className="block pb-0.5">Кутия за</span>
              <span className="block text-[var(--color-brand-orange)]">АКТИВНИ дами</span>
            </h1>
            <p className="text-sm hero-cta-text text-white/85 mt-2 mb-3 leading-relaxed">
              Протеин, облекло, аксесоари, здравословни снакове, добавки и мотивация
            </p>
            <Link href="/order" onClick={() => trackCTAClick({ cta_text: 'Поръчай сега', cta_location: 'hero', destination: '/order' })}>
              <button className="bg-[var(--color-brand-orange)] text-white px-6 py-2.5 hero-cta-button rounded-full text-sm font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
                Поръчай сега
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks steps={[
        { num: 1, title: 'Избери честота', desc: 'Избери колко често искаш да получаваш своята кутия' },
        { num: 2, title: 'Кажи ни предпочитанията си', desc: 'Отговори на кратък въпросник, за да те опознаем по-добре (по желание)' },
        { num: 3, title: 'Завърши', desc: 'Попълни личните си данни и поръчай' },
      ]} />

      {/* Subscription CTA Section */}
      <section className="bg-[var(--color-brand-navy)] py-12 sm:py-14 md:py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold">Абонирай се за FitFlow</h2>
          <p className="mb-8 text-base sm:text-lg text-white/80">
            Получавай кутия със спортни продукти всеки месец или на всеки 3 месеца.
            Спри и поднови по всяко време.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/order"
              onClick={() => trackCTAClick({ cta_text: 'Абонирай се', cta_location: 'subscription_cta', destination: '/order' })}
              className="rounded-lg bg-[var(--color-brand-orange)] px-8 py-3 text-lg font-semibold text-white hover:opacity-100 transition-opacity"
            >
              Абонирай се
            </Link>
            <Link
              href="/box/mystery"
              onClick={() => trackCTAClick({ cta_text: 'Еднократна кутия', cta_location: 'subscription_cta', destination: '/box/mystery' })}
              className="rounded-lg border-2 border-white px-8 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Еднократна кутия
            </Link>
          </div>
        </div>
      </section>

      {/* What's Inside */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-white">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Какво има в кутията?
        </h2>
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-5 md:gap-8">
          {[
            { img: 'protein  nameless.png', title: 'Протеинови продукти', desc: 'Протеинови продукти за подсилване преди и след тренировка', gradient: 'from-[var(--color-brand-orange)] to-[#ff9a3d]' },
            { img: 'botttle no brand.png', title: 'Спортни аксесоари', desc: 'Спортни аксесоари за по-лесни и интересни тренировки', gradient: 'from-[#8ECAE6] to-[#5ab4db]' },
            { img: 'supplement no brand.png', title: 'Добавки', desc: 'Хранителни добавки за здрав дух и здраво тяло', gradient: 'from-[var(--color-brand-navy)] to-[#045a7f]' },
            { img: 'sports bra no logo 2.png', title: 'Спортно облекло', desc: 'Клин, спортен сутиен, тениска и др.', gradient: 'from-[var(--color-brand-orange)] to-[#ff9a3d]' }
          ].map((product, idx) => (
            <div key={idx} className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all border-2 border-transparent hover:border-[var(--color-brand-orange)]">
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-3 sm:mb-4 md:mb-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-15 rounded-xl sm:rounded-2xl`} />
                <Image
                  src={`/storage/${product.img}`}
                  alt={product.title}
                  fill
                  className="object-contain relative z-10"
                />
              </div>
              <h3 className="text-sm sm:text-lg md:text-xl font-bold text-[var(--color-brand-navy)] mb-1 sm:mb-2">{product.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">{product.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 sm:mt-10 md:mt-12">
          <Link href="/order" onClick={() => trackCTAClick({ cta_text: 'Започни сега', cta_location: 'whats_inside', destination: '/order' })}>
            <button className="bg-[var(--color-brand-navy)] text-white px-9 py-3.5 rounded-full text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[#034561] transition-all hover:-translate-y-0.5 hover:shadow-xl">
              Започни сега
            </button>
          </Link>
        </div>
      </section>

      {/* Mystery Box Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-b from-[#e8f4f8] to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
            Еднократна Кутия
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8 max-w-lg mx-auto">
            Не искаш абонамент? Поръчай кутия еднократно - доставяме на{' '}
            {nextDeliveryDate ? (
              <span className="font-semibold text-[var(--color-brand-navy)]">{nextDeliveryDate}</span>
            ) : (
              <span className="font-semibold text-[var(--color-brand-navy)]">следващата дата</span>
            )}!
          </p>
          {nextDeliveryDate && (
            <div className="inline-flex items-center gap-2 bg-[var(--color-brand-orange)] text-white px-5 py-2.5 rounded-full text-sm sm:text-base font-semibold shadow-md mb-6 sm:mb-8">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Следваща доставка: {nextDeliveryDate}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto mb-6 sm:mb-8">
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-100">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-brand-navy)] mb-1">Стандартна</h3>
              <p className="text-xs text-gray-500 mb-1">5-7 продукта</p>
              <p className="text-base sm:text-lg font-bold text-[var(--color-brand-orange)]">{boxPrices['onetime-standard'] ? `${formatPrice(boxPrices['onetime-standard'].finalPriceEur)}€` : '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md border-2 border-[var(--color-brand-orange)] relative">
              <div className="absolute -top-2 right-2 bg-[var(--color-brand-orange)] text-white px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase">Премиум</div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-brand-navy)] mb-1">Премиум</h3>
              <p className="text-xs text-gray-500 mb-1">5-7 продукта</p>
              <p className="text-base sm:text-lg font-bold text-[var(--color-brand-orange)]">{boxPrices['onetime-premium'] ? `${formatPrice(boxPrices['onetime-premium'].finalPriceEur)}€` : '-'}</p>
            </div>
          </div>
          <Link href="/order" onClick={() => trackCTAClick({ cta_text: 'Поръчай еднократна кутия', cta_location: 'mystery_box_section', destination: '/box/mystery' })}>
            <button className="bg-[var(--color-brand-navy)] text-white px-9 py-3.5 rounded-full text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[#034561] transition-all hover:-translate-y-0.5 hover:shadow-xl">
              Поръчай еднократно
            </button>
          </Link>
        </div>
      </section>

      {/* Revealed Box Featured Section - only when available */}
      {revealedBox && (
        <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-br from-[var(--color-brand-orange)]/10 to-[var(--color-brand-orange)]/5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--color-brand-orange)] text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide mb-4 sm:mb-6 shadow-md">
              🎁 РАЗКРИТА КУТИЯ
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] mb-3 sm:mb-4 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
              Виж какво има в кутията за {revealedBox.monthYear}!
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8 max-w-lg mx-auto">
              Съдържанието е разкрито - поръчай с бърза доставка!
            </p>

            {/* Item Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto mb-6 sm:mb-8">
              {revealedBox.items.slice(0, 4).map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-md border border-gray-100 text-center">
                  {item.imageUrl ? (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover rounded-lg"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 bg-gray-50 rounded-lg flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <p className="text-xs sm:text-sm font-semibold text-[var(--color-brand-navy)] line-clamp-2">{item.name}</p>
                </div>
              ))}
            </div>

            {revealedBox.items.length > 4 && (
              <p className="text-sm text-gray-500 mb-4">
                +{revealedBox.items.length - 4} повече
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
              <svg className="w-4 h-4 text-[var(--color-brand-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Бърза доставка до 2-3 работни дни
            </div>

            <Link
              href="/box/current"
              onClick={() => trackCTAClick({ cta_text: 'Виж всички продукти', cta_location: 'revealed_box_section', destination: '/box/current' })}
            >
              <button className="bg-[var(--color-brand-orange)] text-white px-9 py-3.5 rounded-full text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[var(--color-brand-orange-dark)] transition-all hover:-translate-y-0.5 hover:shadow-xl">
                Виж всички продукти →
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Quotes */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-5 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#045a7f]">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
          Вдъхновение
        </h2>
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 md:space-y-10">
          {[
            { text: 'Най-трудно е решението да се действа,<br/>останалото е просто упоритост.', author: 'Амелия Еърхарт' },
            { text: 'Упражненията са ключът не само към физическото здраве,<br/>но и към душевното спокойствие.', author: 'Нелсън Мандела' },
            { text: 'Не спираме да тренираме, защото остаряваме.<br/>Остаряваме, защото спираме да тренираме.', author: 'Д-р Кенет Купър' }
          ].map((quote, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-sm p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-l-4 border-[var(--color-brand-orange)] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl transition-all text-center">
              <p className="text-base sm:text-lg md:text-xl italic text-white leading-relaxed mb-3 sm:mb-4 max-w-2xl mx-auto">
                <span className="text-3xl sm:text-4xl md:text-5xl text-[var(--color-brand-orange)] leading-none mr-1">&quot;</span>
                <span>
                  {quote.text.split('<br/>').map((part, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {part}
                    </Fragment>
                  ))}
                </span>
              </p>
              <p className="text-sm sm:text-base font-semibold text-white">
                <span className="text-[var(--color-brand-orange)]">— </span>{quote.author}
              </p>
            </div>
          ))}
        </div>
      </section>
      </div>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-brand-orange)]"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
