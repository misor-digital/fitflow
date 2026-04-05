'use client';

import { useEffect, useRef } from 'react';
import { trackScrollDepth } from './ga4';

/**
 * Hook that fires GA4 scroll_depth events at specified percentage thresholds.
 * Each threshold fires only once per mount.
 *
 * @param thresholds - Array of percentages to track, e.g. [25, 50, 75, 100]
 * @param pageLocation - Identifier for the page (e.g. 'homepage', 'mystery-box')
 */
export function useScrollDepth(
  thresholds: number[],
  pageLocation: string,
): void {
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const fired = firedRef.current;

    function handleScroll() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const percent = Math.round((window.scrollY / scrollHeight) * 100);

      for (const threshold of thresholds) {
        if (percent >= threshold && !fired.has(threshold)) {
          fired.add(threshold);
          trackScrollDepth({
            percent_scrolled: threshold,
            page_location: pageLocation,
          });
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholds, pageLocation]);
}
