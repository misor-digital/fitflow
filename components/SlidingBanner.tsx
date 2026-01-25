'use client';

import { usePathname } from 'next/navigation';

export default function SlidingBanner() {
  const pathname = usePathname();
  const text = 'БЕЗПЛАТНА доставка на всички предварителни поръчки';
  
  // Hide banner on thank-you/preorder page
  if (
    pathname === '/thank-you/preorder' ||
    pathname.includes('staff') ||
    pathname.includes('account') ||
    pathname.includes('preorder')
  ) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#023047] overflow-hidden h-10 sm:h-12 flex items-center">
      <div className="sliding-banner-content whitespace-nowrap flex">
        {/* Repeat the text multiple times for seamless loop */}
        {[...Array(6)].map((_, i) => (
          <span key={i} className="inline-flex items-center px-12 sm:px-16 md:px-24">
            <span className="text-[#FFD700] font-bold text-xs sm:text-sm md:text-base tracking-wide">
              🚚 {text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
