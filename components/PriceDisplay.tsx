'use client';

import type { PriceDisplayInfo } from '@/lib/preorder';
import { formatPrice } from '@/lib/preorder';

interface PriceDisplayProps {
  priceInfo: PriceDisplayInfo;
}

/**
 * Displays price information with optional discount styling
 * Shows original price crossed out, final price, and discount percentage when applicable
 */
export default function PriceDisplay({ priceInfo }: PriceDisplayProps) {
  if (priceInfo.discountPercent > 0) {
    return (
      <div className="space-y-1">
        <div className="text-sm text-gray-400 line-through">
          {formatPrice(priceInfo.originalPriceBgn)} лв / {formatPrice(priceInfo.originalPriceEur)} €
        </div>
        <div className="text-lg font-bold text-[#FB7D00]">
          {formatPrice(priceInfo.finalPriceBgn)} лв / {formatPrice(priceInfo.finalPriceEur)} €
        </div>
        <div className="text-xs text-green-600 font-semibold">
          -{priceInfo.discountPercent}% отстъпка
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-lg font-bold text-[#023047]">
      {formatPrice(priceInfo.originalPriceBgn)} лв / {formatPrice(priceInfo.originalPriceEur)} €
    </div>
  );
}
