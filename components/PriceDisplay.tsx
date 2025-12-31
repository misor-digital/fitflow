'use client';

import type { PriceDisplayInfo } from '@/lib/preorder';
import { formatPriceDual } from '@/lib/preorder';

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
          {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
        </div>
        <div className="text-lg font-bold text-[#FB7D00]">
          {formatPriceDual(priceInfo.finalPriceEur, priceInfo.finalPriceBgn)}
        </div>
        <div className="text-xs text-green-600 font-semibold">
          -{priceInfo.discountPercent}% отстъпка
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-lg font-bold text-[#023047]">
      {formatPriceDual(priceInfo.originalPriceEur, priceInfo.originalPriceBgn)}
    </div>
  );
}
