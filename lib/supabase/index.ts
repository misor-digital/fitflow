// Supabase client
export { supabase } from './client';

// Types
export type {
  Database,
  Preorder,
  PreorderInsert,
  BoxType,
  BoxTypeRow,
  OptionRow,
  OptionSetId,
  PromoCodeRow,
  UserType,
  StaffRole,
  UserProfileRow,
  UserProfileInsert,
  UserProfileUpdate,
} from './types';

// Services
export { 
  createPreorder, 
  getPreorderById, 
  getPreorderByOrderId, 
  getPreorderByEmail, 
  getAllPreorders, 
  type PreorderFormData 
} from './preorderService';
