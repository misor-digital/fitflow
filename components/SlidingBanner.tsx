'use client';

/**
 * Generic sliding text banner — renders an infinitely scrolling
 * marquee at the very top of the page. Uses the Web Animations API
 * (element.animate) to guarantee motion regardless of CSS layer issues.
 *
 * Usage:
 *   <SlidingBanner text="Your message here" />
 *
 * Sets a CSS variable `--banner-h` on <html> so that Navigation
 * and page content can offset themselves when the banner is visible.
 */

import { useEffect, useRef } from 'react';

interface SlidingBannerProps {
  text: string;
}

export default function SlidingBanner({ text }: SlidingBannerProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Publish banner height as CSS variable
  useEffect(() => {
    const root = document.documentElement;
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

  // Animate via Web Animations API — bypasses all CSS layer issues
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const anim = el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-33.33%)' },
      ],
      { duration: 20000, iterations: Infinity, easing: 'linear' },
    );

    return () => anim.cancel();
  }, [text]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, overflow: 'hidden', display: 'flex', alignItems: 'center' }} className="bg-[var(--color-brand-navy)] h-10 sm:h-12">
      <div ref={trackRef} style={{ display: 'flex', width: 'max-content' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', padding: '0 3rem' }}>
            <span className="text-[#FFD700] font-bold text-xs sm:text-sm md:text-base tracking-wide">
              ⏰ {text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
