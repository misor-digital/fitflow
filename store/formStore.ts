/**
 * Form Store
 * 
 * Client-side state management for the preorder flow.
 * Uses Zustand with persistence to maintain state across page navigations.
 * 
 * NOTE: This store holds raw user input. Derived state (isPremium, validation, etc.)
 * should be computed using functions from @/lib/preorder/derived
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoxTypeId, PreorderUserInput } from '@/lib/preorder';
import { INITIAL_USER_INPUT } from '@/lib/preorder';

/**
 * Marketing attribution data captured from URL parameters
 * Stored in sessionStorage and sent with preorder request
 */
export interface AttributionData {
  /** Marketing click token (mc parameter) */
  mc?: string;
  /** UTM source parameter */
  utm_source?: string;
  /** UTM medium parameter */
  utm_medium?: string;
  /** UTM campaign parameter */
  utm_campaign?: string;
}

/**
 * Form store state and actions
 */
interface FormStore extends PreorderUserInput {
  // Marketing attribution
  attribution: AttributionData | null;
  
  // Actions for Step 1
  setBoxType: (boxType: BoxTypeId | null) => void;
  
  // Actions for Step 2
  setPersonalization: (wants: boolean) => void;
  setSports: (sports: string[]) => void;
  setSportOther: (other: string) => void;
  setColors: (colors: string[]) => void;
  setFlavors: (flavors: string[]) => void;
  setFlavorOther: (other: string) => void;
  setSizes: (upper: string, lower: string) => void;
  setDietary: (dietary: string[]) => void;
  setDietaryOther: (other: string) => void;
  setAdditionalNotes: (notes: string) => void;
  
  // Actions for Step 3
  setContactInfo: (name: string, email: string, phone: string) => void;
  
  // Promo code
  setPromoCode: (code: string | null) => void;
  
  // Marketing attribution
  setAttribution: (attribution: AttributionData | null) => void;
  
  // Reset
  reset: () => void;
}

/**
 * Create the form store with persistence
 */
export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      // Initial state from shared module
      ...INITIAL_USER_INPUT,
      
      // Marketing attribution (initially null)
      attribution: null,
      
      // Step 1: Box Selection
      setBoxType: (boxType) => set({ boxType }),
      
      // Step 2: Personalization
      setPersonalization: (wants) => set({ wantsPersonalization: wants }),
      
      setSports: (sports) => set({ sports }),
      
      setSportOther: (other) => set({ sportOther: other }),
      
      setColors: (colors) => set({ colors }),
      
      setFlavors: (flavors) => set({ flavors }),
      
      setFlavorOther: (other) => set({ flavorOther: other }),
      
      setSizes: (upper, lower) => set({ sizeUpper: upper, sizeLower: lower }),
      
      setDietary: (dietary) => set({ dietary }),
      
      setDietaryOther: (other) => set({ dietaryOther: other }),
      
      setAdditionalNotes: (notes) => set({ additionalNotes: notes }),
      
      // Step 3: Contact Info
      setContactInfo: (name, email, phone) => 
        set({ fullName: name, email, phone }),
      
      // Promo code
      setPromoCode: (code) => set({ promoCode: code }),
      
      // Marketing attribution
      // Only set once per session, never overwrite existing attribution
      setAttribution: (attribution) => set((state) => {
        // Don't overwrite existing attribution
        if (state.attribution !== null) {
          return state;
        }
        return { attribution };
      }),
      
      // Reset to initial state
      reset: () => set({ ...INITIAL_USER_INPUT, attribution: null }),
    }),
    {
      name: 'fitflow-form-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

/**
 * Hook to get user input as PreorderUserInput type
 * Useful for passing to derived state functions
 */
export function usePreorderInput(): PreorderUserInput {
  const store = useFormStore();
  return {
    boxType: store.boxType,
    wantsPersonalization: store.wantsPersonalization,
    sports: store.sports,
    sportOther: store.sportOther,
    colors: store.colors,
    flavors: store.flavors,
    flavorOther: store.flavorOther,
    sizeUpper: store.sizeUpper,
    sizeLower: store.sizeLower,
    dietary: store.dietary,
    dietaryOther: store.dietaryOther,
    additionalNotes: store.additionalNotes,
    fullName: store.fullName,
    email: store.email,
    phone: store.phone,
    promoCode: store.promoCode,
  };
}

/**
 * Hook to get attribution data for preorder submission
 */
export function useAttribution(): AttributionData | null {
  return useFormStore((state) => state.attribution);
}
