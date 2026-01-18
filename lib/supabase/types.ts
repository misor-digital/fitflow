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
  // Marketing attribution fields (written once at creation, never updated)
  marketing_campaign_id?: string | null;
  marketing_recipient_id?: string | null;
  marketing_click_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export interface Preorder extends PreorderInsert {
  id: string;
  order_id: string;
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
// User Roles Table
// ============================================================================

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: 'admin' | 'ops' | 'marketing';
  created_at: string;
  created_by: string | null;
}

export interface UserRoleInsert {
  user_id: string;
  role: 'admin' | 'ops' | 'marketing';
  created_by?: string | null;
}

// ============================================================================
// Audit Logs Table
// ============================================================================

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ============================================================================
// Database Schema Type (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      preorders: {
        Row: Preorder;
        Insert: PreorderInsert;
        Update: Partial<PreorderInsert>;
        Relationships: [];
      };
      box_types: {
        Row: BoxTypeRow;
        Insert: BoxTypeInsert;
        Update: BoxTypeUpdate;
        Relationships: [];
      };
      promo_codes: {
        Row: PromoCodeRow;
        Insert: PromoCodeInsert;
        Update: PromoCodeUpdate;
        Relationships: [];
      };
      options: {
        Row: OptionRow;
        Insert: OptionInsert;
        Update: OptionUpdate;
        Relationships: [];
      };
      site_config: {
        Row: SiteConfigRow;
        Insert: SiteConfigInsert;
        Update: SiteConfigUpdate;
        Relationships: [];
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: UserRoleInsert;
        Update: Partial<UserRoleInsert>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<
      string,
      {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: unknown[]
      }
    >;
    Functions: {
      calculate_box_prices: {
        Args: { p_promo_code: string | null };
        Returns: BoxPriceInfo[];
      };
      has_role: {
        Args: { p_user_id: string; p_role: string };
        Returns: boolean;
      };
      get_user_roles: {
        Args: { p_user_id: string };
        Returns: string[];
      };
      create_audit_log: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_metadata: string | null;
          p_ip_address: string | null;
          p_user_agent: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      box_type: BoxType;
    };
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
