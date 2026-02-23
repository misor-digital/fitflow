'use client';

interface PromoDiscountPromptProps {
  discountPercent: number;
}

/**
 * Animated discount prompt that appears below the CTA button.
 * Uses pure CSS animation (pulse-gentle) — no JS setInterval, no re-renders.
 */
export default function PromoDiscountPrompt({ discountPercent }: PromoDiscountPromptProps) {
  if (discountPercent <= 0) {
    return null;
  }

  return (
    <div
      className="absolute top-full right-0 mt-3 animate-pulse-gentle"
    >
      <div className="bg-[#FFD700] px-3 py-2 rounded-xl shadow-xl relative">
        {/* Arrow pointing up at CTA */}
        <div className="absolute -top-2 right-3 md:right-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-[#FFD700]" />
        
        <p className="text-xs font-extrabold text-[var(--color-brand-navy)] whitespace-nowrap relative z-10 flex items-center gap-1.5">
          <span className="text-sm bg-[var(--color-brand-navy)] px-1.5 py-0.5 rounded-full">🎉</span>
          <span>Имаш <span className="text-[#c41e3a] font-black">{discountPercent}%</span> отстъпка!</span>
        </p>
      </div>
    </div>
  );
}
