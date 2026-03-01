'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore, useOrderInput, getOrderInput } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { computeOrderDerivedState, transformOrderToApiRequest, transformOrderToSubscriptionRequest } from '@/lib/order';
import type { OrderStep, PricesMap } from '@/lib/order';
import { isSubscriptionBox } from '@/lib/catalog';
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
  const isSubmittingRef = useRef(false);

  const { currentStep, setStep, promoCode, orderType } =
    useOrderStore();
  const input = useOrderInput();
  const user = useAuthStore((s) => s.user);
  const derived = computeOrderDerivedState(input);

  // Revealed box: skip personalization step entirely
  const isRevealedBox = orderType === 'onetime-revealed' || propOrderType === 'onetime-revealed';
  const activeSteps: OrderStep[] = useMemo(
    () => (isRevealedBox ? [1, 3, 4] : [1, 2, 3, 4]),
    [isRevealedBox],
  );

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
  // Scroll to top on step change (skip during submission / navigation)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (hydrated && !isSubmittingRef.current) {
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
    // Read fresh state from the store to avoid stale-closure issues
    // (child components update the store right before calling onNext)
    const freshDerived = computeOrderDerivedState(getOrderInput());

    // Validate current step before advancing
    switch (currentStep) {
      case 1:
        if (!freshDerived.isStep1Valid) return;
        break;
      case 2:
        if (!freshDerived.isStep2Valid) return;
        break;
      case 3: {
        if (!freshDerived.isStep3Valid) return;
        break;
      }
    }
    goToNextActiveStep();
  }, [currentStep, goToNextActiveStep]);

  // ---------------------------------------------------------------------------
  // Order submission
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      let currentInput = getOrderInput();
      const isSubscription = isSubscriptionBox(currentInput.boxType);

      let responseData: Record<string, unknown>;

      if (isSubscription) {
        // ---- Subscription flow ----
        // Subscriptions require a saved address. When the user entered a new
        // inline address (selectedAddressId is null), persist it first via the
        // address API and use the returned ID for the subscription request.
        if (!currentInput.selectedAddressId) {
          const addrRes = await fetch('/api/address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentInput.address),
          });
          const addrData = await addrRes.json();
          if (!addrRes.ok || !addrData.address?.id) {
            throw new Error(addrData.error || 'Грешка при запазване на адреса');
          }
          currentInput = { ...currentInput, selectedAddressId: addrData.address.id };
          useOrderStore.getState().setSelectedAddressId(addrData.address.id);
        }

        const subscriptionRequest = transformOrderToSubscriptionRequest(currentInput);
        const response = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionRequest),
        });
        responseData = await response.json();

        if (!responseData.success) {
          throw new Error(
            (responseData.error as string) || 'Създаването на абонамент не беше успешно',
          );
        }

        // Store subscription info for thank-you page
        const sub = responseData.subscription as Record<string, unknown>;
        sessionStorage.setItem(
          'fitflow-last-order',
          JSON.stringify({
            orderNumber: null,
            orderId: null,
            subscriptionId: sub.id,
            email: currentInput.email || user?.email,
            isGuest: false,
            isSubscription: true,
            boxType: currentInput.boxType,
            finalPriceEur: sub.current_price_eur ?? null,
          }),
        );
      } else {
        // ---- One-time order flow (existing) ----
        const apiRequest = transformOrderToApiRequest(currentInput);
        const response = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiRequest),
        });
        responseData = await response.json();

        if (!responseData.success) {
          throw new Error(
            (responseData.error as string) || 'Изпращането на поръчката не беше успешно',
          );
        }

        // Store order info for thank-you page
        sessionStorage.setItem(
          'fitflow-last-order',
          JSON.stringify({
            orderNumber: responseData.orderNumber,
            orderId: responseData.orderId,
            email: currentInput.email || user?.email,
            isGuest: currentInput.isGuest,
            isSubscription: false,
            finalPriceEur: responseData.finalPriceEur ?? null,
          }),
        );
      }

      // Clear order store so next visit starts fresh
      useOrderStore.getState().reset();

      router.push('/order/thank-you');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Възникна неочаквана грешка',
      );
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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
