'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore, getOrderInput } from '@/store/orderStore';
import { computeOrderDerivedState } from '@/lib/order';
import type { CatalogData, PricesMap } from '@/lib/catalog';
import OrderStepConfirm from './OrderStepConfirm';
import { useOrderSubmit } from './useOrderSubmit';

interface OrderConfirmClientProps {
  initialPrices: PricesMap;
  catalogData: CatalogData;
}

export default function OrderConfirmClient({ initialPrices, catalogData }: OrderConfirmClientProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const boxType = useOrderStore((s) => s.boxType);
  const orderType = useOrderStore((s) => s.orderType);
  const { submit, isSubmitting, submitError } = useOrderSubmit();

  const isRevealedBox = orderType === 'onetime-revealed';

  // Hydration guard
  useEffect(() => {
    const unsub = useOrderStore.persist.onFinishHydration(() => setHydrated(true));
    if (useOrderStore.persist.hasHydrated()) {
      // Defer to avoid a synchronous setState-in-effect (cascading render)
      queueMicrotask(() => setHydrated(true));
    }
    return () => unsub?.();
  }, []);

  // Guard: if the user lands here without a complete order, send them back.
  useEffect(() => {
    if (!hydrated) return;
    if (!boxType) {
      router.replace('/order');
      return;
    }
    const derived = computeOrderDerivedState(getOrderInput());
    if (!derived.isStep3Valid) {
      router.replace('/order');
    }
  }, [hydrated, boxType, router]);

  useEffect(() => {
    if (isSubmitting) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSubmitting]);

  if (!hydrated || !boxType) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-orange)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <OrderStepConfirm
        prices={initialPrices}
        catalogData={catalogData}
        onBack={() => router.push('/order')}
        onEdit={() => router.push('/order')}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        isRevealedBox={isRevealedBox}
      />

      {submitError && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">{submitError}</div>
      )}
    </div>
  );
}
