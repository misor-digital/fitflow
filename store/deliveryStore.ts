/**
 * Delivery Store
 *
 * Shared client-side cache for public delivery data consumed by
 * Navigation (revealed-box boolean), the homepage (full revealed-box
 * payload + upcoming delivery date), and potentially other pages.
 *
 * - Each resource is fetched **once**, then served from memory.
 * - Concurrent in-flight requests are deduplicated (module-level promises).
 * - Re-fetches after CACHE_TTL (5 min) — matches the API `s-maxage`.
 */

import { create } from 'zustand';

// ---- Types ----------------------------------------------------------------

interface RevealedBoxCycle {
  id: string;
  deliveryDate: string;
  title: string | null;
  description: string | null;
}

interface RevealedBoxItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
}

export interface RevealedBoxPayload {
  cycle: RevealedBoxCycle;
  items: RevealedBoxItem[];
  availableUntil: string | null;
}

export interface UpcomingDeliveryPayload {
  cycle: { id: string; deliveryDate: string; title: string | null } | null;
  isFirstDelivery: boolean;
  nextDeliveryDate: string;
}

interface DeliveryState {
  /** Full revealed-box API response (null when unavailable / not yet loaded). */
  revealedBox: RevealedBoxPayload | null;
  /** Convenience boolean — true when a revealed box exists. */
  revealedBoxAvailable: boolean;
  /** True after the first revealed-box fetch completes (success or failure). */
  isLoaded: boolean;
  /** Trigger a revealed-box fetch (deduped + TTL-gated). */
  fetchRevealedBox: () => Promise<void>;

  /** Upcoming delivery API response (null before first fetch or on error). */
  upcomingDelivery: UpcomingDeliveryPayload | null;
  /** True after the first upcoming fetch completes. */
  isUpcomingLoaded: boolean;
  /** Trigger an upcoming-delivery fetch (deduped + TTL-gated). */
  fetchUpcomingDelivery: () => Promise<void>;
}

// ---- Module-level dedup / TTL state ----------------------------------------

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let revealedLastFetchedAt = 0;
let revealedFetchPromise: Promise<void> | null = null;

let upcomingLastFetchedAt = 0;
let upcomingFetchPromise: Promise<void> | null = null;

// ---- Store -----------------------------------------------------------------

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  // -- Revealed box --
  revealedBox: null,
  revealedBoxAvailable: false,
  isLoaded: false,

  fetchRevealedBox: async () => {
    const now = Date.now();
    if (get().isLoaded && now - revealedLastFetchedAt < CACHE_TTL) return;
    if (revealedFetchPromise) return revealedFetchPromise;

    revealedFetchPromise = (async () => {
      try {
        const res = await fetch('/api/delivery/current');

        if (!res.ok) {
          set({ revealedBox: null, revealedBoxAvailable: false, isLoaded: true });
          return;
        }

        const data = await res.json();

        set({
          revealedBox: data.cycle ? data : null,
          revealedBoxAvailable: !!data.cycle,
          isLoaded: true,
        });
      } catch {
        set({ revealedBox: null, revealedBoxAvailable: false, isLoaded: true });
      } finally {
        revealedLastFetchedAt = Date.now();
        revealedFetchPromise = null;
      }
    })();

    return revealedFetchPromise;
  },

  // -- Upcoming delivery --
  upcomingDelivery: null,
  isUpcomingLoaded: false,

  fetchUpcomingDelivery: async () => {
    const now = Date.now();
    if (get().isUpcomingLoaded && now - upcomingLastFetchedAt < CACHE_TTL) return;
    if (upcomingFetchPromise) return upcomingFetchPromise;

    upcomingFetchPromise = (async () => {
      try {
        const res = await fetch('/api/delivery/upcoming');

        if (!res.ok) {
          set({ upcomingDelivery: null, isUpcomingLoaded: true });
          return;
        }

        const data: UpcomingDeliveryPayload = await res.json();
        set({ upcomingDelivery: data, isUpcomingLoaded: true });
      } catch {
        set({ upcomingDelivery: null, isUpcomingLoaded: true });
      } finally {
        upcomingLastFetchedAt = Date.now();
        upcomingFetchPromise = null;
      }
    })();

    return upcomingFetchPromise;
  },
}));
