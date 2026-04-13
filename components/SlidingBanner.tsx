'use client';

/**
 * Generic sliding text banner — renders a continuously scrolling
 * horizontal marquee at the very top of the page.
 *
 * Usage:
 *   <SlidingBanner text="Your message here" />
 *
 * Sets a CSS variable `--banner-h` on <html> so that Navigation
 * and page content can offset themselves when the banner is visible.
 */

import { useEffect } from 'react';

interface SlidingBannerProps {
  text: string;
}

export default function SlidingBanner({ text }: SlidingBannerProps) {
  // Publish banner height as CSS variable so Navigation / pages can offset
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--banner-h', '2.5rem');
    const mq = window.matchMedia('(min-width: 640px)');
    function update() {
      root.style.setProperty('--banner-h', mq.matches ? '3rem' : '2.5rem');
    }
    update();
    mq.addEventListener('change', update);
    return () => {
      root.style.setProperty('--banner-h', '0px');
      mq.removeEventListener('change', update);
    };
  }, []);

  return (
    <>
      {/* Keyframes must be in the DOM before the animation style is evaluated */}
      <style>{`
        @keyframes sliding-banner-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-brand-navy)] overflow-hidden h-10 sm:h-12 flex items-center">
        <div
          className="whitespace-nowrap flex"
          style={{
            animation: 'sliding-banner-scroll 20s linear infinite',
            willChange: 'transform',
          }}
        >
          {[0, 1].map((i) => (
            <span key={i} className="inline-flex shrink-0 items-center justify-center min-w-[100vw]">
              <span className="text-[#FFD700] font-bold text-xs sm:text-sm md:text-base tracking-wide">
                ⏰ {text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
