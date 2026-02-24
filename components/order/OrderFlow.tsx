'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore, useOrderInput } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { computeOrderDerivedState, transformOrderToApiRequest } from '@/lib/order';
import type { OrderStep, PricesMap } from '@/lib/order';
import type { CatalogData } from '@/lib/catalog';
import OrderStepBox from './OrderStepBox';
import OrderStepPersonalize from './OrderStepPersonalize';
import OrderStepDetails from './OrderStepDetails';
import OrderStepConfirm from './OrderStepConfirm';
import OrderStepper from './OrderStepper';

interface OrderFlowProps {
  initialPrices: PricesMap;
  boxTypeNames: Record<string, string>;
  catalogData: CatalogData;
}

export default function OrderFlow({
  initialPrices,
  boxTypeNames,
  catalogData,
}: OrderFlowProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [prices, setPrices] = useState<PricesMap>(initialPrices);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastPromoRef = useRef<string | null>(null);

  const { currentStep, setStep, goToNextStep, goToPreviousStep, promoCode } =
    useOrderStore();
  const input = useOrderInput();
  const user = useAuthStore((s) => s.user);
  const derived = computeOrderDerivedState(input);

  // ---------------------------------------------------------------------------
  // Hydration guard — avoid server/client mismatch with sessionStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsub = useOrderStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useOrderStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => unsub?.();
  }, []);

  // ---------------------------------------------------------------------------
  // Scroll to top on step change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (hydrated) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, hydrated]);

  // ---------------------------------------------------------------------------
  // Promo code price refresh
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only re-fetch if the promo code actually changed
    if (!hydrated) return;
    if (promoCode === lastPromoRef.current) return;
    lastPromoRef.current = promoCode;

    if (!promoCode) {
      // Reset to initial prices (no promo)
      setPrices(initialPrices);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/catalog?type=prices&promoCode=${encodeURIComponent(promoCode)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.prices) {
          setPrices(data.prices);
        }
      } catch {
        // silently keep current prices on network error
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [promoCode, hydrated, initialPrices]);

  // ---------------------------------------------------------------------------
  // Step navigation with validation guards
  // ---------------------------------------------------------------------------
  const handleNextStep = useCallback(() => {
    // Validate current step before advancing
    switch (currentStep) {
      case 1:
        if (!derived.isStep1Valid) return;
        break;
      case 2:
        if (!derived.isStep2Valid) return;
        break;
      case 3:
        if (!derived.isStep3Valid) return;
        break;
    }
    goToNextStep();
  }, [currentStep, derived, goToNextStep]);

  const handleGoToStep = useCallback(
    (step: OrderStep) => {
      // Only allow navigating backward to completed steps
      if (step < currentStep) {
        setStep(step);
      }
    },
    [currentStep, setStep],
  );

  // ---------------------------------------------------------------------------
  // Order submission
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const currentInput = useOrderStore.getState();
      const apiRequest = transformOrderToApiRequest({
        boxType: currentInput.boxType,
        wantsPersonalization: currentInput.wantsPersonalization,
        sports: currentInput.sports,
        sportOther: currentInput.sportOther,
        colors: currentInput.colors,
        flavors: currentInput.flavors,
        flavorOther: currentInput.flavorOther,
        sizeUpper: currentInput.sizeUpper,
        sizeLower: currentInput.sizeLower,
        dietary: currentInput.dietary,
        dietaryOther: currentInput.dietaryOther,
        additionalNotes: currentInput.additionalNotes,
        isGuest: currentInput.isGuest,
        fullName: currentInput.fullName,
        email: currentInput.email,
        phone: currentInput.phone,
        selectedAddressId: currentInput.selectedAddressId,
        address: currentInput.address,
        promoCode: currentInput.promoCode,
        conversionToken: currentInput.conversionToken,
      });

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiRequest),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Изпращането на поръчката не беше успешно');
      }

      // Store order info for thank-you page
      sessionStorage.setItem(
        'fitflow-last-order',
        JSON.stringify({
          orderNumber: data.orderNumber,
          orderId: data.orderId,
          email: currentInput.email || user?.email,
          isGuest: currentInput.isGuest,
        }),
      );

      router.push('/order/thank-you');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Възникна неочаквана грешка',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [router, user?.email]);

  // ---------------------------------------------------------------------------
  // Loading state during hydration
  // ---------------------------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <OrderStepper
        currentStep={currentStep}
        isStep1Valid={derived.isStep1Valid}
        isStep2Valid={derived.isStep2Valid}
        isStep3Valid={derived.isStep3Valid}
      />

      {currentStep === 1 && (
        <OrderStepBox
          prices={prices}
          boxTypeNames={boxTypeNames}
          onNext={handleNextStep}
        />
      )}

      {currentStep === 2 && (
        <OrderStepPersonalize
          catalogData={catalogData}
          onNext={handleNextStep}
          onBack={goToPreviousStep}
        />
      )}

      {currentStep === 3 && (
        <OrderStepDetails
          onNext={handleNextStep}
          onBack={goToPreviousStep}
        />
      )}

      {currentStep === 4 && (
        <OrderStepConfirm
          prices={prices}
          catalogData={catalogData}
          onBack={goToPreviousStep}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {submitError && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {submitError}
        </div>
      )}
    </div>
  );
}
