'use client';

import { useEffect, useState } from 'react';
import type { DeliveryMethod } from '@/lib/order';

interface DeliveryPricingItem {
  method: DeliveryMethod;
  priceEur: number;
  label: string;
}

interface UseDeliveryPricingResult {
  pricing: Map<DeliveryMethod, { priceEur: number; label: string }>;
  isLoading: boolean;
  error: string | null;
}

let cachedPricing: Map<DeliveryMethod, { priceEur: number; label: string }> | null = null;

/**
 * Hook to fetch and cache delivery pricing from the API.
 * Data is cached in-memory across re-renders/mounts.
 */
export function useDeliveryPricing(): UseDeliveryPricingResult {
  const [pricing, setPricing] = useState<Map<DeliveryMethod, { priceEur: number; label: string }>>(
    cachedPricing ?? new Map(),
  );
  const [isLoading, setIsLoading] = useState(!cachedPricing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedPricing) return;

    let cancelled = false;

    async function fetchPricing() {
      try {
        const res = await fetch('/api/delivery/pricing');
        if (!res.ok) throw new Error('Failed to fetch delivery pricing');
        const json = await res.json();
        const map = new Map<DeliveryMethod, { priceEur: number; label: string }>();
        for (const item of json.pricing as DeliveryPricingItem[]) {
          map.set(item.method, { priceEur: item.priceEur, label: item.label });
        }
        cachedPricing = map;
        if (!cancelled) {
          setPricing(map);
          setIsLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    fetchPricing();
    return () => { cancelled = true; };
  }, []);

  return { pricing, isLoading, error };
}
