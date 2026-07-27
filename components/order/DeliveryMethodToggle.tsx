'use client';

import type { DeliveryMethod } from '@/lib/order';
import { useDeliveryPricing } from '@/hooks/useDeliveryPricing';

interface DeliveryMethodToggleProps {
  value: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
}

const OPTIONS: { method: DeliveryMethod; label: string; icon: string }[] = [
  { method: 'speedy_office', label: 'Speedy офис', icon: '📦' },
  { method: 'speedy_automat', label: 'Speedy автомат', icon: '🔒' },
  { method: 'address', label: 'До адрес', icon: '🏠' },
];

export default function DeliveryMethodToggle({ value, onChange }: DeliveryMethodToggleProps) {
  const { pricing } = useDeliveryPricing();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
      {OPTIONS.map(({ method, label, icon }) => {
        const isActive = value === method;
        const price = pricing.get(method);
        return (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`py-3 px-3 border-2 rounded-xl font-semibold text-xs sm:text-sm transition-all flex flex-col items-center justify-center gap-1 ${
              isActive
                ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{label}</span>
            </span>
            {price && (
              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                {price.priceEur.toFixed(2)} €
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
