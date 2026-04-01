'use client';

import type { SubscriptionConversionFlowProps } from './conversion-types';

/**
 * Subscription conversion flow — Phase 11 placeholder.
 * Will be replaced with the full multi-step conversion wizard.
 */
export default function SubscriptionConversionFlow({
  source,
  priceInfo,
  catalogData,
  boxTypeNames,
  upcomingCycle,
}: SubscriptionConversionFlowProps) {
  const boxLabel = boxTypeNames[source.boxType] ?? source.boxType;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Конвертиране към абонамент
      </h1>
      <p className="text-gray-600 mb-6">
        Поръчка #{source.orderNumber} — {boxLabel}
      </p>
      <p className="text-sm text-gray-500">
        Цена: {priceInfo.finalPriceEur.toFixed(2)} EUR
        {upcomingCycle && (
          <> · Следваща доставка: {upcomingCycle.delivery_date}</>
        )}
      </p>
      <p className="mt-4 text-sm text-amber-600">
        Пълният формуляр за конвертиране ще бъде наличен скоро.
      </p>
      {/* Suppress unused-vars — catalogData consumed by future Phase 11 */}
      <span className="hidden">{catalogData.boxTypes.length}</span>
    </div>
  );
}
