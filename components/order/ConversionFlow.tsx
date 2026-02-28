'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore, useOrderInput } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { computeOrderDerivedState, transformOrderToApiRequest } from '@/lib/order';
import type { PricesMap, CatalogData, PriceInfo } from '@/lib/catalog';
import type { ConversionSource } from './ConversionSummary';
import ConversionSummary from './ConversionSummary';
import OrderStepDetails from './OrderStepDetails';
import OrderStepConfirm from './OrderStepConfirm';

type ConversionStep = 'summary' | 'address' | 'confirm';

interface ConversionFlowProps {
  source: ConversionSource;
  priceInfo: PriceInfo;
  catalogData: CatalogData;
  boxTypeNames: Record<string, string>;
}

/**
 * Client component managing the conversion-specific 2-step process:
 * 1. Summary (readonly legacy order data) → 2. Address → 3. Confirm & submit
 *
 * Prefills the order store from legacy order data so shared step components
 * (OrderStepDetails, OrderStepConfirm) can read from the same store.
 */
export default function ConversionFlow({
  source,
  priceInfo,
  catalogData,
  boxTypeNames,
}: ConversionFlowProps) {
  const router = useRouter();
  const [conversionStep, setConversionStep] = useState<ConversionStep>('summary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const user = useAuthStore((s) => s.user);

  // Build a prices map from the single priceInfo (keyed by the source's box type)
  const prices: PricesMap = { [source.boxType]: priceInfo };

  // Prefill the order store with legacy order data on mount (once)
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;

    const store = useOrderStore.getState();

    // Reset and prefill
    store.reset();
    store.prefillFromConversion({
      boxType: source.boxType as Parameters<typeof store.prefillFromConversion>[0]['boxType'],
      wantsPersonalization: source.wantsPersonalization,
      sports: source.sports ?? [],
      sportOther: source.sportOther ?? '',
      colors: source.colors ?? [],
      flavors: source.flavors ?? [],
      flavorOther: source.flavorOther ?? '',
      sizeUpper: source.sizeUpper ?? '',
      sizeLower: source.sizeLower ?? '',
      dietary: source.dietary ?? [],
      dietaryOther: source.dietaryOther ?? '',
      additionalNotes: source.additionalNotes ?? '',
      fullName: source.fullName,
      email: source.email,
      phone: source.phone ?? '',
      promoCode: source.promoCode,
    });

    // Set contact info from legacy order
    store.setContactInfo(
      source.fullName,
      source.email,
      source.phone ?? '',
    );

    // Prefill address name/phone from the preorder so the delivery form
    // doesn't start empty when an admin converts on behalf of a customer.
    store.setAddress({
      fullName: source.fullName,
      phone: source.phone ?? '',
    });

    // Set conversion token
    store.setConversionToken(source.conversionToken);
  }, [source]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [conversionStep]);

  // Derive validation state from the store
  const input = useOrderInput();
  const derived = computeOrderDerivedState(input);

  // Address step → confirm
  const handleAddressNext = useCallback(() => {
    if (!derived.isStep3Valid) return;
    setConversionStep('confirm');
  }, [derived.isStep3Valid]);

  // Confirm → back to address
  const handleConfirmBack = useCallback(() => {
    setConversionStep('address');
  }, []);

  // Address → back to summary
  const handleAddressBack = useCallback(() => {
    setConversionStep('summary');
  }, []);

  // Order submission (same as OrderFlow.handleSubmit but always includes conversionToken)
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
        deliveryMethod: currentInput.deliveryMethod,
        speedyOffice: currentInput.speedyOffice,
        onBehalfOfUserId: currentInput.onBehalfOfUserId,
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Conversion progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['summary', 'address', 'confirm'] as const).map((step, i) => {
          const labels = ['Преглед', 'Адрес', 'Потвърждение'];
          const stepIndex = ['summary', 'address', 'confirm'].indexOf(conversionStep);
          const isActive = conversionStep === step;
          const isCompleted = i < stepIndex;

          return (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 ${
                    isCompleted || isActive ? 'bg-[var(--color-brand-orange)]' : 'bg-gray-200'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive
                      ? 'bg-[var(--color-brand-orange)] text-white'
                      : isCompleted
                        ? 'bg-[var(--color-brand-orange)]/20 text-[var(--color-brand-orange)]'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-[var(--color-brand-orange)]' : 'text-gray-500'
                  }`}
                >
                  {labels[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion title */}
      <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Завършете поръчката
      </h1>

      {/* Step: Summary (readonly legacy order data) */}
      {conversionStep === 'summary' && (
        <div>
          <ConversionSummary
            source={source}
            priceInfo={priceInfo}
            catalogData={catalogData}
            boxTypeNames={boxTypeNames}
          />

          <div className="flex justify-center mt-8">
            <button
              onClick={() => setConversionStep('address')}
              className="bg-[var(--color-brand-orange)] text-white px-8 sm:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Продължи
            </button>
          </div>
        </div>
      )}

      {/* Step: Address (reuses OrderStepDetails) */}
      {conversionStep === 'address' && (
        <OrderStepDetails
          onNext={handleAddressNext}
          onBack={handleAddressBack}
        />
      )}

      {/* Step: Confirm (reuses OrderStepConfirm) */}
      {conversionStep === 'confirm' && (
        <OrderStepConfirm
          prices={prices}
          catalogData={catalogData}
          onBack={handleConfirmBack}
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
