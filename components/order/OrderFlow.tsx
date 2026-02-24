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
  initialBoxType?: string;       // pre-select box type from URL
  deliveryCycleId?: string;      // link order to delivery cycle
  orderType?: string;            // 'onetime-mystery' | 'onetime-revealed'
}

export default function OrderFlow({
  initialPrices,
  boxTypeNames,
  catalogData,
  initialBoxType,
  deliveryCycleId: propCycleId,
  orderType: propOrderType,
}: OrderFlowProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [prices, setPrices] = useState<PricesMap>(initialPrices);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastPromoRef = useRef<string | null>(null);

  const { currentStep, setStep, goToNextStep, goToPreviousStep, promoCode, orderType } =
    useOrderStore();
  const input = useOrderInput();
  const user = useAuthStore((s) => s.user);
  const derived = computeOrderDerivedState(input);

  // Revealed box: skip personalization step entirely
  const isRevealedBox = orderType === 'onetime-revealed' || propOrderType === 'onetime-revealed';
  const activeSteps: OrderStep[] = isRevealedBox ? [1, 3, 4] : [1, 2, 3, 4];

  // ---------------------------------------------------------------------------
  // Pre-selection from URL params (mystery box flow)
  // ---------------------------------------------------------------------------
  const hasAppliedPreselection = useRef(false);

  useEffect(() => {
    if (!hydrated || hasAppliedPreselection.current) return;
    hasAppliedPreselection.current = true;

    const store = useOrderStore.getState();

    // Set delivery cycle fields
    if (propCycleId) {
      store.setDeliveryCycleId(propCycleId);
    }
    if (propOrderType) {
      store.setOrderType(propOrderType);
    }

    // Pre-select box type and auto-advance
    if (initialBoxType && !store.boxType) {
      const validTypes = ['onetime-standard', 'onetime-premium', 'monthly-standard', 'monthly-premium'];
      if (validTypes.includes(initialBoxType)) {
        store.setBoxType(initialBoxType as import('@/lib/catalog').BoxTypeId);
        // For revealed box, skip personalization → go to step 3 (details)
        if (propOrderType === 'onetime-revealed') {
          store.setStep(3 as OrderStep);
        } else {
          store.setStep(2 as OrderStep);
        }
      }
    }
  }, [hydrated, initialBoxType, propCycleId, propOrderType]);

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
  // Navigate to next active step, skipping steps not in activeSteps
  const goToNextActiveStep = useCallback(() => {
    const currentIndex = activeSteps.indexOf(currentStep);
    if (currentIndex < activeSteps.length - 1) {
      setStep(activeSteps[currentIndex + 1]);
    }
  }, [currentStep, activeSteps, setStep]);

  // Navigate to previous active step
  const goToPreviousActiveStep = useCallback(() => {
    const currentIndex = activeSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setStep(activeSteps[currentIndex - 1]);
    }
  }, [currentStep, activeSteps, setStep]);

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
    goToNextActiveStep();
  }, [currentStep, derived, goToNextActiveStep]);

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
        deliveryCycleId: currentInput.deliveryCycleId,
        orderType: currentInput.orderType,
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
        steps={activeSteps}
      />

      {currentStep === 1 && (
        <OrderStepBox
          prices={prices}
          boxTypeNames={boxTypeNames}
          onNext={handleNextStep}
        />
      )}

      {currentStep === 2 && !isRevealedBox && (
        <OrderStepPersonalize
          catalogData={catalogData}
          onNext={handleNextStep}
          onBack={goToPreviousActiveStep}
        />
      )}

      {currentStep === 3 && (
        <OrderStepDetails
          onNext={handleNextStep}
          onBack={goToPreviousActiveStep}
        />
      )}

      {currentStep === 4 && (
        <OrderStepConfirm
          prices={prices}
          catalogData={catalogData}
          onBack={goToPreviousActiveStep}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isRevealedBox={isRevealedBox}
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
