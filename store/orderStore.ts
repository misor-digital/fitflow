/**
 * Order Store
 *
 * Client-side state management for the order flow.
 * Uses Zustand with persistence to maintain state across step transitions.
 *
 * NOTE: This store holds raw user input. Derived state (isPremium, validation, etc.)
 * should be computed using functions from @/lib/order/derived
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoxTypeId, UserInput } from '@/lib/catalog';
import type { OrderUserInput, OrderStep, AddressInput } from '@/lib/order';
import { INITIAL_ORDER_INPUT } from '@/lib/order';

/**
 * Order store state and actions
 */
interface OrderStore extends OrderUserInput {
  // Navigation
  currentStep: OrderStep;

  // Step 1
  setBoxType: (boxType: BoxTypeId | null) => void;

  // Step 2 — personalization
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

  // Step 3
  setGuestMode: (isGuest: boolean) => void;
  setContactInfo: (name: string, email: string, phone: string) => void;
  setSelectedAddressId: (id: string | null) => void;
  setAddress: (address: Partial<AddressInput>) => void;

  // Promo
  setPromoCode: (code: string | null) => void;

  // Conversion
  setConversionToken: (token: string | null) => void;
  prefillFromConversion: (source: UserInput) => void;

  // Navigation
  setStep: (step: OrderStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Reset
  reset: () => void;
}

/**
 * Create the order store with persistence
 */
export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...INITIAL_ORDER_INPUT,
      currentStep: 1 as OrderStep,

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

      // Step 3: Identity & Address
      setGuestMode: (isGuest) => set({ isGuest }),
      setContactInfo: (name, email, phone) =>
        set({ fullName: name, email, phone }),
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      setAddress: (partial) =>
        set((state) => ({
          address: { ...state.address, ...partial },
        })),

      // Promo
      setPromoCode: (code) => set({ promoCode: code }),

      // Conversion
      setConversionToken: (token) => set({ conversionToken: token }),

      prefillFromConversion: (source) =>
        set({
          boxType: source.boxType,
          wantsPersonalization: source.wantsPersonalization,
          sports: source.sports,
          sportOther: source.sportOther,
          colors: source.colors,
          flavors: source.flavors,
          flavorOther: source.flavorOther,
          sizeUpper: source.sizeUpper,
          sizeLower: source.sizeLower,
          dietary: source.dietary,
          dietaryOther: source.dietaryOther,
          additionalNotes: source.additionalNotes,
          promoCode: source.promoCode,
        }),

      // Navigation
      setStep: (step) => set({ currentStep: step }),
      goToNextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: (currentStep + 1) as OrderStep });
        }
      },
      goToPreviousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as OrderStep });
        }
      },

      // Reset
      reset: () => set({ ...INITIAL_ORDER_INPUT, currentStep: 1 as OrderStep }),
    }),
    {
      name: 'fitflow-order-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/**
 * Hook to get user input as OrderUserInput type.
 * Useful for passing to derived state / validation functions.
 */
export function useOrderInput(): OrderUserInput {
  const store = useOrderStore();
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
    isGuest: store.isGuest,
    fullName: store.fullName,
    email: store.email,
    phone: store.phone,
    selectedAddressId: store.selectedAddressId,
    address: store.address,
    promoCode: store.promoCode,
    conversionToken: store.conversionToken,
  };
}
