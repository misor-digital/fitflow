import { supabaseAdmin } from './admin';
import type { PreorderInsert, Preorder } from './types';
import { transformToPersistedFormat } from '@/lib/preorder/transform';
import type { PreorderUserInput, PriceInfo } from '@/lib/preorder/types';

export interface PreorderFormData {
  // Step 1
  boxType: string;
  
  // Step 2
  wantsPersonalization: boolean;
  sports?: string[];
  sportOther?: string;
  colors?: string[];
  flavors?: string[];
  flavorOther?: string;
  sizeUpper?: string;
  sizeLower?: string;
  dietary?: string[];
  dietaryOther?: string;
  additionalNotes?: string;
  
  // Step 3
  fullName: string;
  email: string;
  phone?: string;
  
  // Promo code (validated server-side)
  promoCode?: string | null;
  discountPercent?: number | null;
  originalPriceEur?: number | null;
  finalPriceEur?: number | null;
}

/**
 * Adapt legacy PreorderFormData to PreorderUserInput for the canonical transform
 */
function toUserInput(data: PreorderFormData): PreorderUserInput {
  return {
    boxType: data.boxType as PreorderUserInput['boxType'],
    wantsPersonalization: data.wantsPersonalization ?? false,
    sports: data.sports ?? [],
    sportOther: data.sportOther ?? '',
    colors: data.colors ?? [],
    flavors: data.flavors ?? [],
    flavorOther: data.flavorOther ?? '',
    sizeUpper: data.sizeUpper ?? '',
    sizeLower: data.sizeLower ?? '',
    dietary: data.dietary ?? [],
    dietaryOther: data.dietaryOther ?? '',
    additionalNotes: data.additionalNotes ?? '',
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? '',
    promoCode: data.promoCode ?? null,
  };
}

/**
 * Create a new preorder in the database
 */
export async function createPreorder(data: PreorderFormData): Promise<{ data: Preorder | null; error: Error | null }> {
  try {
    const userInput = toUserInput(data);
    const priceInfo: PriceInfo | null = data.originalPriceEur != null
      ? {
          boxTypeId: data.boxType,
          boxTypeName: '',
          originalPriceEur: data.originalPriceEur ?? 0,
          originalPriceBgn: 0,
          discountPercent: data.discountPercent ?? 0,
          discountAmountEur: 0,
          discountAmountBgn: 0,
          finalPriceEur: data.finalPriceEur ?? 0,
          finalPriceBgn: 0,
          promoCode: data.promoCode ?? null,
        }
      : null;
    const insertData = transformToPersistedFormat(userInput, priceInfo) satisfies PreorderInsert;
    
    const { data: preorder, error } = await supabaseAdmin
      .from('preorders')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating preorder:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorder, error: null };
  } catch (err) {
    console.error('Error creating preorder:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a preorder by ID (UUID)
 */
export async function getPreorderById(id: string): Promise<{ data: Preorder | null; error: Error | null }> {
  try {
    const { data: preorder, error } = await supabaseAdmin
      .from('preorders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching preorder:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorder, error: null };
  } catch (err) {
    console.error('Error fetching preorder:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a preorder by human-readable order ID (e.g., FF-201224-A7K2)
 */
export async function getPreorderByOrderId(orderId: string): Promise<{ data: Preorder | null; error: Error | null }> {
  try {
    const { data: preorder, error } = await supabaseAdmin
      .from('preorders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      console.error('Supabase error fetching preorder by order_id:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorder, error: null };
  } catch (err) {
    console.error('Error fetching preorder by order_id:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a preorder by email
 */
export async function getPreorderByEmail(email: string): Promise<{ data: Preorder[] | null; error: Error | null }> {
  try {
    const { data: preorders, error } = await supabaseAdmin
      .from('preorders')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching preorders by email:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorders, error: null };
  } catch (err) {
    console.error('Error fetching preorders by email:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all preorders (for admin purposes)
 */
export async function getAllPreorders(): Promise<{ data: Preorder[] | null; error: Error | null }> {
  try {
    const { data: preorders, error } = await supabaseAdmin
      .from('preorders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching all preorders:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorders, error: null };
  } catch (err) {
    console.error('Error fetching all preorders:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
