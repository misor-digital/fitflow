'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/orderStore';
import { isPremiumBox } from '@/lib/catalog';
import type { CatalogData, PricesMap, BoxTypeId } from '@/lib/catalog';
import OrderStepBox from './OrderStepBox';
import OrderStepDetails from './OrderStepDetails';
import { SizeQuestion, DietaryQuestion } from './PersonalizationQuestions';

interface OrderPageFlowProps {
  initialPrices: PricesMap;
  boxTypeNames: Record<string, string>;
  catalogData: CatalogData;
  initialBoxType?: string;
  deliveryCycleId?: string;
  orderType?: string;
}

const VALID_BOX_TYPES = ['onetime-standard', 'onetime-premium', 'monthly-standard', 'monthly-premium'];

export default function OrderPageFlow({
  initialPrices,
  boxTypeNames,
  catalogData,
  initialBoxType,
  deliveryCycleId: propCycleId,
  orderType: propOrderType,
}: OrderPageFlowProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [promoPrices, setPromoPrices] = useState<{ code: string; map: PricesMap } | null>(null);
  const hasAppliedPreselection = useRef(false);

  const boxType = useOrderStore((s) => s.boxType);
  const sizeUpper = useOrderStore((s) => s.sizeUpper);
  const sizeLower = useOrderStore((s) => s.sizeLower);
  const dietary = useOrderStore((s) => s.dietary);
  const dietaryOther = useOrderStore((s) => s.dietaryOther);
  const orderType = useOrderStore((s) => s.orderType);
  const promoCode = useOrderStore((s) => s.promoCode);

  // Prices are the promo-adjusted overlay when it matches the current promo
  // code, otherwise the server-provided defaults. Derived during render so the
  // promo effect only ever sets state asynchronously.
  const prices: PricesMap = promoPrices && promoPrices.code === promoCode ? promoPrices.map : initialPrices;

  const isPremium = isPremiumBox(boxType);
  const isRevealedBox = orderType === 'onetime-revealed' || propOrderType === 'onetime-revealed';

  const sizesOptions = catalogData?.options?.sizes ?? [];
  const dietaryOptions = catalogData?.options?.dietary ?? [];

  // Section refs for smooth scroll-on-select
  const sizeRef = useRef<HTMLDivElement>(null);
  const dietaryRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    // Defer to next frame so any newly-revealed section is mounted first.
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Hydration guard
  useEffect(() => {
    const unsub = useOrderStore.persist.onFinishHydration(() => setHydrated(true));
    if (useOrderStore.persist.hasHydrated()) {
      // Defer to avoid a synchronous setState-in-effect (cascading render)
      queueMicrotask(() => setHydrated(true));
    }
    return () => unsub?.();
  }, []);

  // Apply URL pre-selection once hydrated
  useEffect(() => {
    if (!hydrated || hasAppliedPreselection.current) return;
    hasAppliedPreselection.current = true;

    const store = useOrderStore.getState();
    if (propCycleId) store.setDeliveryCycleId(propCycleId);
    if (propOrderType) store.setOrderType(propOrderType);

    if (initialBoxType && !store.boxType && VALID_BOX_TYPES.includes(initialBoxType)) {
      store.setBoxType(initialBoxType as BoxTypeId);
      if (propOrderType !== 'onetime-revealed') {
        store.setPersonalization(true);
      }
    }
  }, [hydrated, initialBoxType, propCycleId, propOrderType]);

  // Promo price refresh — fetch the discounted prices for the active promo.
  // Only ever sets state inside the async callback (no synchronous setState).
  useEffect(() => {
    if (!hydrated || !promoCode) return;
    if (promoPrices?.code === promoCode) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/catalog?type=prices&promoCode=${encodeURIComponent(promoCode)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.prices) setPromoPrices({ code: promoCode, map: data.prices });
      } catch {
        /* keep current prices on error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [promoCode, hydrated, promoPrices]);

  // -------------------------------------------------------------------------
  // Selection handlers (mark personalization + scroll forward)
  // -------------------------------------------------------------------------
  const handleBoxSelected = useCallback(() => {
    const store = useOrderStore.getState();
    const premium = isPremiumBox(store.boxType);
    if (!isRevealedBox) {
      store.setPersonalization(true);
      scrollTo(premium ? sizeRef : dietaryRef);
    } else {
      scrollTo(deliveryRef);
    }
  }, [isRevealedBox, scrollTo]);

  const handleSelectUpper = useCallback(
    (id: string) => {
      const store = useOrderStore.getState();
      store.setSizes(id, store.sizeLower);
    },
    [],
  );

  const handleSelectLower = useCallback(
    (id: string) => {
      const store = useOrderStore.getState();
      store.setSizes(store.sizeUpper, id);
      if (store.sizeUpper) scrollTo(dietaryRef);
    },
    [scrollTo],
  );

  const handleDietaryToggle = useCallback(
    (id: string) => {
      const store = useOrderStore.getState();
      const wasEmpty = store.dietary.length === 0;
      if (id === 'none') {
        store.setDietary(['none']);
        store.setDietaryOther('');
      } else {
        const withoutNone = store.dietary.filter((d) => d !== 'none');
        const next = withoutNone.includes(id)
          ? withoutNone.filter((d) => d !== id)
          : [...withoutNone, id];
        store.setDietary(next);
      }
      // Scroll to delivery on the first dietary selection only (avoid yanking
      // the viewport while the user is still toggling multiple options).
      if (wasEmpty && id !== 'other') scrollTo(deliveryRef);
    },
    [scrollTo],
  );

  // -------------------------------------------------------------------------
  // Section visibility
  // -------------------------------------------------------------------------
  const boxSelected = !!boxType;
  const sizeAnswered = !isPremium || (!!sizeUpper && !!sizeLower);
  const dietaryAnswered = dietary.length > 0;
  const showQuestions = boxSelected && !isRevealedBox;
  const showDelivery = isRevealedBox
    ? boxSelected
    : boxSelected && sizeAnswered && dietaryAnswered;

  const goToConfirm = useCallback(() => router.push('/order/confirm'), [router]);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div ref={topRef} />

      {/* 1. Box selection (no nav button; scroll on select) */}
      <OrderStepBox
        prices={prices}
        boxTypeNames={boxTypeNames}
        onNext={goToConfirm}
        onSelectBox={handleBoxSelected}
        hideNav
      />

      {/* 2. Size (premium only) */}
      {showQuestions && isPremium && sizesOptions.length > 0 && (
        <section ref={sizeRef} className="scroll-mt-24 mt-12 sm:mt-16">
          <SizeQuestion
            sizes={sizesOptions}
            sizeUpper={sizeUpper}
            sizeLower={sizeLower}
            onSelectUpper={handleSelectUpper}
            onSelectLower={handleSelectLower}
          />
        </section>
      )}

      {/* 3. Dietary */}
      {showQuestions && dietaryOptions.length > 0 && (
        <section ref={dietaryRef} className="scroll-mt-24 mt-12 sm:mt-16">
          <DietaryQuestion
            options={dietaryOptions}
            dietary={dietary}
            dietaryOther={dietaryOther}
            onToggle={handleDietaryToggle}
            onChangeOther={(val) => useOrderStore.getState().setDietaryOther(val)}
          />
        </section>
      )}

      {/* 4. Delivery details — reuses existing step logic; its own "Напред"
          button advances to the confirmation page. */}
      {showDelivery && (
        <section ref={deliveryRef} className="scroll-mt-24 mt-12 sm:mt-16">
          <OrderStepDetails
            onNext={goToConfirm}
            onBack={() => scrollTo(topRef)}
          />
        </section>
      )}
    </div>
  );
}
