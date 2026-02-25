'use client';

import type { DeliveryMethod } from '@/lib/order';

interface DeliveryMethodToggleProps {
  value: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
}

const OPTIONS: { method: DeliveryMethod; label: string; icon: string }[] = [
  { method: 'speedy_office', label: 'До офис на Speedy', icon: '📦' },
  { method: 'address', label: 'Доставка до адрес', icon: '🏠' },
];

export default function DeliveryMethodToggle({ value, onChange }: DeliveryMethodToggleProps) {
  return (
    <div className="flex gap-2 sm:gap-3">
      {OPTIONS.map(({ method, label, icon }) => {
        const isActive = value === method;
        return (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`flex-1 py-3 px-4 border-2 rounded-xl font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
              isActive
                ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                : 'bg-white text-[var(--color-brand-navy)] border-gray-300 hover:border-[var(--color-brand-orange)]'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
