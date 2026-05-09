'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

const slides = [
  {
    desktop: '/storage/carousel/marathon-desktop.png',
    mobile: '/storage/carousel/marathon-mobile.png',
    alt: 'FitFlow - Благотворителна кампания в подкрепа на онкоболни студенти - за каузата на "Студентите бягат с УАСГ" 2026',
    mobileOverlay: true,
  },
  {
    desktop: '/storage/carousel/box-april-desktop.jpg',
    mobile: '/storage/carousel/box-april-mobile.png',
    alt: 'FitFlow - кутия Април 2026',
  },
  {
    desktop: '/storage/carousel/girls-desktop.jpg',
    mobile: '/storage/carousel/girls-mobile.png',
    alt: 'FitFlow - спортни продукти и аксесоари',
  },
  {
    desktop: '/storage/carousel/box-march-desktop.png',
    mobile: '/storage/carousel/box-march-mobile.png',
    alt: 'FitFlow - кутия Март 2026',
  },
];

const INTERVAL_MS = 5000;
const TRANSITION_MS = 700;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useRef(false);

  // Check prefers-reduced-motion once on mount
  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % slides.length);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused || reducedMotion.current) return;
    timerRef.current = setInterval(advance, INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, advance]);

  const goTo = (index: number) => {
    setActive(index);
    // Reset timer on manual navigation
    if (timerRef.current) clearInterval(timerRef.current);
    if (!paused && !reducedMotion.current) {
      timerRef.current = setInterval(advance, INTERVAL_MS);
    }
  };

  return (
    <>
    <div
      className="absolute inset-x-0 bottom-0 z-10"
      style={{ top: 'var(--banner-h, 0px)' }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero изображения"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== active}
          className="absolute inset-0"
          style={{
            opacity: i === active ? 1 : 0,
            transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
          }}
        >
          {/* Portrait / mobile */}
          <Image
            src={slide.mobile}
            alt={slide.alt}
            fill
            quality={90}
            className="object-cover hero-portrait"
            priority={i === 0}
            sizes="100vw"
          />
          {/* Landscape / desktop */}
          <Image
            src={slide.desktop}
            alt={slide.alt}
            fill
            quality={90}
            className="object-cover hero-landscape"
            style={{ objectPosition: 'left bottom' }}
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Слайд ${i + 1}`}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === active
                ? 'bg-white scale-110 shadow-md'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>

    {/* Mobile-only text overlay for charity slide — rendered outside z-10 carousel */}
    <div
      className="absolute inset-0 z-35 pointer-events-none flex items-center justify-center landscape:hidden"
      style={{
        opacity: active === 0 ? 1 : 0,
        transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
      }}
    >
      <div className="bg-[rgba(90,30,30,0.75)] backdrop-blur-[2px] rounded-xl px-5 py-5 mx-4 text-center">
        <p className="text-white font-extrabold text-lg leading-tight mb-1">
          <span className="text-[#FB7D00] text-2xl">10%</span> от всяка продадена кутия
        </p>
        <p className="text-white/90 italic text-base mb-3">
          през май ще бъдат дарени
        </p>
        <p className="text-white/80 font-bold text-[0.65rem] uppercase tracking-wide leading-snug">
          За каузата на &quot;Студентите бягат с УАСГ&quot; 2026 — подпомагане на онкоболни студенти.
        </p>
        <p className="text-[#FB7D00] font-bold text-[0.65rem] uppercase tracking-wide leading-snug mt-2">
          Допълнително: всеки участник ще получи 10% отстъпка към стартовите номера.
        </p>
      </div>
    </div>
  </>
  );
}
