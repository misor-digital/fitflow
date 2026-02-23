/**
 * Database types for Supabase
 * 
 * Update using: supabase gen types typescript
 */

export type BoxType = 
  | 'monthly-standard' 
  | 'monthly-premium' 
  | 'monthly-premium-monthly' 
  | 'monthly-premium-seasonal' 
  | 'onetime-standard' 
  | 'onetime-premium';

// ============================================================================
// Preorders Table
// ============================================================================

export interface PreorderInsert {
  full_name: string;
  email: string;
  phone?: string | null;
  box_type: BoxType;
  wants_personalization: boolean;
  sports?: string[] | null;
  sport_other?: string | null;
  colors?: string[] | null;
  flavors?: string[] | null;
  flavor_other?: string | null;
  size_upper?: string | null;
  size_lower?: string | null;
  dietary?: string[] | null;
  dietary_other?: string | null;
  additional_notes?: string | null;
  // Promo code fields
  promo_code?: string | null;
  discount_percent?: number | null;
  original_price_eur?: number | null;
  final_price_eur?: number | null;
}

export interface Preorder extends PreorderInsert {
  id: string;
  order_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Box Types Table
// ============================================================================

export interface BoxTypeRow {
  id: string;
  name: string;
  description: string | null;
  price_eur: number;
  is_subscription: boolean;
  is_premium: boolean;
  frequency: string | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoxTypeInsert {
  id: string;
  name: string;
  description?: string | null;
  price_eur: number;
  is_subscription?: boolean;
  is_premium?: boolean;
  frequency?: string | null;
  sort_order?: number;
  is_enabled?: boolean;
}

export interface BoxTypeUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  price_eur?: number;
  is_subscription?: boolean;
  is_premium?: boolean;
  frequency?: string | null;
  sort_order?: number;
  is_enabled?: boolean;
}

// ============================================================================
// Promo Codes Table
// ============================================================================

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_percent: number;
  description: string | null;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  current_uses: number;
  min_order_value_eur: number | null;
  applicable_box_types: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeInsert {
  code: string;
  discount_percent: number;
  description?: string | null;
  is_enabled?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
  current_uses?: number;
  min_order_value_eur?: number | null;
  applicable_box_types?: string[] | null;
}

export interface PromoCodeUpdate {
  code?: string;
  discount_percent?: number;
  description?: string | null;
  is_enabled?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
  current_uses?: number;
  min_order_value_eur?: number | null;
  applicable_box_types?: string[] | null;
}

// ============================================================================
// Options Table
// ============================================================================

export type OptionSetId = 'sports' | 'colors' | 'flavors' | 'dietary' | 'sizes';

export interface OptionRow {
  id: string;
  option_set_id: string;
  label: string;
  value: string | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionInsert {
  id: string;
  option_set_id: string;
  label: string;
  value?: string | null;
  sort_order?: number;
  is_enabled?: boolean;
}

export interface OptionUpdate {
  id?: string;
  option_set_id?: string;
  label?: string;
  value?: string | null;
  sort_order?: number;
  is_enabled?: boolean;
}

// ============================================================================
// Site Config Table
// ============================================================================

export interface SiteConfigRow {
  key: string;
  value: string;
  description: string | null;
  value_type: string;
  created_at: string;
  updated_at: string;
}

export interface SiteConfigInsert {
  key: string;
  value: string;
  description?: string | null;
  value_type?: string;
}

export interface SiteConfigUpdate {
  key?: string;
  value?: string;
  description?: string | null;
  value_type?: string;
}

// ============================================================================
// User Profiles Table
// ============================================================================

export type UserType = 'customer' | 'staff';

export type StaffRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'warehouse'
  | 'marketing'
  | 'support'
  | 'finance'
  | 'content'
  | 'analyst';

export interface UserProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  user_type: UserType;
  staff_role: StaffRole | null;
  is_subscriber: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  user_type?: UserType;
  staff_role?: StaffRole | null;
  is_subscriber?: boolean;
}

export interface UserProfileUpdate {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  user_type?: UserType;
  staff_role?: StaffRole | null;
  is_subscriber?: boolean;
}

// ============================================================================
// RPC Function Return Types
// ============================================================================

export interface BoxPriceInfo {
  box_type_id: string;
  box_type_name: string;
  original_price_eur: number;
  original_price_bgn: number;
  discount_percent: number;
  discount_amount_eur: number;
  discount_amount_bgn: number;
  final_price_eur: number;
  final_price_bgn: number;
}

// ============================================================================
// Database Schema Type (for Supabase client)
// ============================================================================

/**
 * Converts an interface to a plain mapped type so it satisfies
 * Record<string, unknown> in TypeScript 5.9+.
 * (TS 5.9 no longer considers interfaces assignable to index-signature types.)
 */
type ToRecord<T> = { [K in keyof T]: T[K] };

export interface Database {
  public: {
    Tables: {
      preorders: {
        Row: ToRecord<Preorder>;
        Insert: ToRecord<PreorderInsert>;
        Update: ToRecord<Partial<PreorderInsert>>;
        Relationships: [];
      };
      box_types: {
        Row: ToRecord<BoxTypeRow>;
        Insert: ToRecord<BoxTypeInsert>;
        Update: ToRecord<BoxTypeUpdate>;
        Relationships: [];
      };
      promo_codes: {
        Row: ToRecord<PromoCodeRow>;
        Insert: ToRecord<PromoCodeInsert>;
        Update: ToRecord<PromoCodeUpdate>;
        Relationships: [];
      };
      options: {
        Row: ToRecord<OptionRow>;
        Insert: ToRecord<OptionInsert>;
        Update: ToRecord<OptionUpdate>;
        Relationships: [];
      };
      site_config: {
        Row: ToRecord<SiteConfigRow>;
        Insert: ToRecord<SiteConfigInsert>;
        Update: ToRecord<SiteConfigUpdate>;
        Relationships: [];
      };
      user_profiles: {
        Row: ToRecord<UserProfileRow>;
        Insert: ToRecord<UserProfileInsert>;
        Update: ToRecord<UserProfileUpdate>;
        Relationships: [{
          foreignKeyName: 'user_profiles_id_fkey';
          columns: ['id'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_box_prices: {
        Args: { p_promo_code: string | null };
        Returns: BoxPriceInfo[];
      };
      check_rate_limit: {
        Args: { p_key: string; p_max_requests: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      box_type: BoxType;
      user_type: UserType;
      staff_role: StaffRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
