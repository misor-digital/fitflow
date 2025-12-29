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
import { persist } from 'zustand/middleware';
import type { BoxTypeId, PreorderUserInput } from '@/lib/preorder';
import { INITIAL_USER_INPUT } from '@/lib/preorder';

/**
 * Form store state and actions
 */
interface FormStore extends PreorderUserInput {
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
      
      // Reset to initial state
      reset: () => set(INITIAL_USER_INPUT),
    }),
    {
      name: 'fitflow-form-storage',
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
