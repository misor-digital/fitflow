import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormData {
  // Step 1
  boxType: 'monthly-standard' | 'monthly-premium' | 'monthly-premium-monthly' | 'monthly-premium-seasonal' | 'onetime-standard' | 'onetime-premium' | null;
  
  // Step 2
  wantsPersonalization: boolean | null;
  sports: string[];
  sportOther: string;
  colors: string[];
  flavors: string[];
  flavorOther: string;
  sizeUpper: string;
  sizeLower: string;
  dietary: string[];
  dietaryOther: string;
  additionalNotes: string;
  
  // Step 3
  fullName: string;
  email: string;
  phone: string;
  
  // Promo code (from URL query string)
  promoCode: string | null;
  // Discount percentage (validated server-side)
  discountPercent: number;
}

interface FormStore extends FormData {
  setBoxType: (boxType: FormData['boxType']) => void;
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
  setContactInfo: (name: string, email: string, phone: string) => void;
  setPromoCode: (code: string | null, discountPercent?: number) => void;
  reset: () => void;
}

const initialState: FormData = {
  boxType: null,
  wantsPersonalization: null,
  sports: [],
  sportOther: '',
  colors: [],
  flavors: [],
  flavorOther: '',
  sizeUpper: '',
  sizeLower: '',
  dietary: [],
  dietaryOther: '',
  additionalNotes: '',
  fullName: '',
  email: '',
  phone: '',
  promoCode: null,
  discountPercent: 0,
};

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setBoxType: (boxType) => set({ boxType }),
      
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
      
      setContactInfo: (name, email, phone) => 
        set({ fullName: name, email, phone }),
      
      setPromoCode: (code, discountPercent = 0) => 
        set({ promoCode: code, discountPercent }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'fitflow-form-storage',
    }
  )
);
