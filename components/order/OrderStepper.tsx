'use client';

import type { OrderStep } from '@/lib/order';
import { useOrderStore } from '@/store/orderStore';

interface OrderStepperProps {
  currentStep: OrderStep;
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  steps?: OrderStep[]; // default [1,2,3,4] — pass [1,3,4] to skip personalization
}

const ALL_STEP_LABELS: Record<OrderStep, string> = {
  1: 'Кутия',
  2: 'Персонализация',
  3: 'Данни',
  4: 'Потвърждение',
};

export default function OrderStepper({
  currentStep,
  isStep1Valid,
  isStep2Valid,
  isStep3Valid,
  steps: stepsProp,
}: OrderStepperProps) {
  const { setStep } = useOrderStore();

  const steps: OrderStep[] = stepsProp ?? [1, 2, 3, 4];

  const isCompleted = (step: OrderStep): boolean => {
    if (step >= currentStep) return false;
    switch (step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      default: return false;
    }
  };

  const canNavigate = (step: OrderStep): boolean => {
    // Can always go to current or earlier completed steps
    if (step >= currentStep) return false;
    return isCompleted(step);
  };

  const handleClick = (step: OrderStep) => {
    if (canNavigate(step)) {
      setStep(step);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
      {steps.map((step, index) => {
        const completed = isCompleted(step);
        const active = step === currentStep;
        const clickable = canNavigate(step);

        return (
          <div key={step} className="flex items-center">
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => handleClick(step)}
              disabled={!clickable}
              className={`flex items-center gap-1.5 sm:gap-2 transition-all ${
                clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              aria-label={`Стъпка ${step}: ${ALL_STEP_LABELS[step]}`}
              aria-current={active ? 'step' : undefined}
            >
              {/* Circle / Checkmark */}
              <div
                className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  active
                    ? 'bg-[var(--color-brand-orange)] text-white shadow-md'
                    : completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                {completed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>

              {/* Label — hidden on mobile, shown on sm+ */}
              <span
                className={`hidden sm:inline text-xs sm:text-sm font-semibold transition-colors ${
                  active
                    ? 'text-[var(--color-brand-orange)]'
                    : completed
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                {ALL_STEP_LABELS[step]}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 transition-colors ${
                  isCompleted(steps[index + 1]) || steps[index + 1] === currentStep
                    ? 'bg-[var(--color-brand-orange)]'
                    : completed
                      ? 'bg-green-300'
                      : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
