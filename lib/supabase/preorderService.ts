import { supabase } from './client';
import type { PreorderInsert, Preorder } from './types';

export interface PreorderFormData {
  // Step 1
  boxType: string;
  
  // Step 2
  wantsPersonalization: boolean;
  sports?: string[];
  sportOther?: string;
  colors?: string[];
  contents?: string[];
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
}

/**
 * Transform form data from the frontend to database format
 */
function transformFormDataToInsert(data: PreorderFormData): PreorderInsert {
  return {
    full_name: data.fullName,
    email: data.email,
    phone: data.phone || null,
    box_type: data.boxType as PreorderInsert['box_type'],
    wants_personalization: data.wantsPersonalization,
    sports: data.sports?.length ? data.sports : null,
    sport_other: data.sportOther || null,
    colors: data.colors?.length ? data.colors : null,
    contents: data.contents?.length ? data.contents : null,
    flavors: data.flavors?.length ? data.flavors : null,
    flavor_other: data.flavorOther || null,
    size_upper: data.sizeUpper || null,
    size_lower: data.sizeLower || null,
    dietary: data.dietary?.length ? data.dietary : null,
    dietary_other: data.dietaryOther || null,
    additional_notes: data.additionalNotes || null,
  };
}

/**
 * Create a new preorder in the database
 */
export async function createPreorder(data: PreorderFormData): Promise<{ data: Preorder | null; error: Error | null }> {
  try {
    const insertData = transformFormDataToInsert(data);
    
    const { data: preorder, error } = await supabase
      .from('preorders')
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating preorder:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorder as Preorder, error: null };
  } catch (err) {
    console.error('Error creating preorder:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a preorder by ID
 */
export async function getPreorderById(id: string): Promise<{ data: Preorder | null; error: Error | null }> {
  try {
    const { data: preorder, error } = await supabase
      .from('preorders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching preorder:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorder as Preorder, error: null };
  } catch (err) {
    console.error('Error fetching preorder:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a preorder by email
 */
export async function getPreorderByEmail(email: string): Promise<{ data: Preorder[] | null; error: Error | null }> {
  try {
    const { data: preorders, error } = await supabase
      .from('preorders')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching preorders by email:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorders as Preorder[], error: null };
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
    const { data: preorders, error } = await supabase
      .from('preorders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching all preorders:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: preorders as Preorder[], error: null };
  } catch (err) {
    console.error('Error fetching all preorders:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
