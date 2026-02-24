// Clients
export { createClient as createBrowserClient } from './browser';
export { createClient as createServerClient } from './server';
export { supabaseAdmin } from './admin';

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


