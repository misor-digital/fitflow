'use client';

import { useState, useEffect } from 'react';

interface PromoDiscountPromptProps {
  discountPercent: number;
}

/**
 * Animated discount prompt that appears below the CTA button
 * Shows for a few seconds, hides, then reappears in a loop
 * Features a gold background with party emoji badge and arrow pointing up
 */
export default function PromoDiscountPrompt({ discountPercent }: PromoDiscountPromptProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Promo prompt animation - show/hide cycle
  useEffect(() => {
    if (discountPercent === 0) return;

    // Initial delay before first appearance
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    // Set up the show/hide cycle
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 4000); // Toggle every 4 seconds

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [discountPercent]);

  if (discountPercent === 0) {
    return null;
  }

  return (
    <div
      className={`
        absolute top-full right-0 mt-3
        bg-[#FFD700]
        px-3 py-2 rounded-xl
        shadow-xl
        transition-all duration-500 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'}
      `}
    >
      {/* Arrow pointing up at CTA */}
      <div className="absolute -top-2 right-3 md:right-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-[#FFD700]" />
      
      <p className="text-xs font-extrabold text-[#023047] whitespace-nowrap relative z-10 flex items-center gap-1.5">
        <span className="text-sm bg-[#023047] px-1.5 py-0.5 rounded-full">🎉</span>
        <span>Имаш <span className="text-[#c41e3a] font-black">{discountPercent}%</span> отстъпка!</span>
      </p>
    </div>
  );
}
