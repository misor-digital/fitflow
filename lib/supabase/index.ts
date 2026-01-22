// Supabase client
export { supabase } from './client';

// Core Supabase types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './types';

// Import for type aliases
import type { Tables, TablesInsert, Enums } from './types';

// Legacy type aliases for backwards compatibility
// DEPRECATED: Use types from @/lib/domain instead
export type Preorder = Tables<'preorders'>;
export type PreorderInsert = TablesInsert<'preorders'>;
export type BoxType = Enums<'box_type'>;
export type BoxTypeRow = Tables<'box_types'>;
export type OptionRow = Tables<'options'>;
export type PromoCodeRow = Tables<'promo_codes'>;
export type SubscriptionStatus = Enums<'subscription_status'>;

// Option set IDs (legacy)
export type OptionSetId = 'sports' | 'colors' | 'flavors' | 'dietary' | 'sizes-upper' | 'sizes-lower';

// Services
export { 
  createPreorder, 
  getPreorderById, 
  getPreorderByOrderId, 
  getPreorderByEmail, 
  getAllPreorders, 
  type PreorderFormData 
} from './preorderService';
