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
  // Audit fields
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface Preorder extends PreorderInsert {
  id: string;
  order_id: string;
  created_at: string;
  updated_at: string;
  last_edited_at?: string | null;
  edit_count?: number;
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
// Preorder Edit Tokens Table
// ============================================================================

export interface PreorderEditTokenRow {
  id: string;
  preorder_id: string;
  token: string;
  purpose: 'edit' | 'cancel';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface PreorderEditTokenInsert {
  preorder_id: string;
  purpose: 'edit' | 'cancel';
  expires_at: string;
  token?: string;
}

// ============================================================================
// Newsletter Subscriptions Table
// ============================================================================

export type SubscriptionStatus = 'pending' | 'subscribed' | 'unsubscribed';

export interface NewsletterSubscriptionRow {
  id: string;
  email: string;
  status: SubscriptionStatus;
  confirmation_token: string;
  confirmed_at: string | null;
  unsubscribe_token: string;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriptionInsert {
  email: string;
  status?: SubscriptionStatus;
  source?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ============================================================================
// Audit Logs Table
// ============================================================================

export type ActorType = 'staff' | 'customer' | 'system' | 'anonymous';

export interface AuditLogRow {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  actor_type: ActorType;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  metadata?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ============================================================================
// Customers Table
// ============================================================================

export interface CustomerRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  preferred_language: string;
  marketing_consent: boolean;
  marketing_consent_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  user_id: string;
  full_name: string;
  phone?: string | null;
  preferred_language?: string;
  marketing_consent?: boolean;
  marketing_consent_date?: string | null;
}

// ============================================================================
// Roles Table
// ============================================================================

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleInsert {
  name: string;
  description?: string | null;
  is_system?: boolean;
}

// ============================================================================
// Staff Users Table
// ============================================================================

export interface StaffUserRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  requires_password_reset: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffUserInsert {
  user_id: string;
  full_name: string;
  email: string;
  is_active?: boolean;
  requires_password_reset?: boolean;
}

// ============================================================================
// Staff Role Assignments Table
// ============================================================================

export interface StaffRoleAssignmentRow {
  id: string;
  staff_user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface StaffRoleAssignmentInsert {
  staff_user_id: string;
  role_id: string;
  assigned_by?: string | null;
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
      preorder_edit_tokens: {
        Row: PreorderEditTokenRow;
        Insert: PreorderEditTokenInsert;
        Update: Partial<PreorderEditTokenInsert>;
        Relationships: [
          {
            foreignKeyName: 'preorder_edit_tokens_preorder_id_fkey';
            columns: ['preorder_id'];
            referencedRelation: 'preorders';
            referencedColumns: ['id'];
          }
        ];
      };
      newsletter_subscriptions: {
        Row: NewsletterSubscriptionRow;
        Insert: NewsletterSubscriptionInsert;
        Update: Partial<NewsletterSubscriptionInsert>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: Partial<CustomerInsert>;
        Relationships: [
          {
            foreignKeyName: 'customers_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      roles: {
        Row: RoleRow;
        Insert: RoleInsert;
        Update: Partial<RoleInsert>;
        Relationships: [];
      };
      staff_users: {
        Row: StaffUserRow;
        Insert: StaffUserInsert;
        Update: Partial<StaffUserInsert>;
        Relationships: [
          {
            foreignKeyName: 'staff_users_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      staff_role_assignments: {
        Row: StaffRoleAssignmentRow;
        Insert: StaffRoleAssignmentInsert;
        Update: Partial<StaffRoleAssignmentInsert>;
        Relationships: [
          {
            foreignKeyName: 'staff_role_assignments_staff_user_id_fkey';
            columns: ['staff_user_id'];
            referencedRelation: 'staff_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_role_assignments_role_id_fkey';
            columns: ['role_id'];
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_box_prices: {
        Args: { p_promo_code: string | null };
        Returns: BoxPriceInfo[];
      };
      create_audit_log: {
        Args: {
          p_actor_type: ActorType;
          p_actor_id: string | null;
          p_actor_email: string | null;
          p_action: string;
          p_resource_type: string;
          p_resource_id: string | null;
          p_metadata?: Record<string, any> | null;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      has_role: {
        Args: {
          p_user_id: string;
          p_role_name: string;
        };
        Returns: boolean;
      };
      has_any_role: {
        Args: {
          p_user_id: string;
          p_role_names: string[];
        };
        Returns: boolean;
      };
      is_staff_user: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      box_type: BoxType;
      subscription_status: SubscriptionStatus;
      actor_type: ActorType;
    };
    CompositeTypes: Record<string, never>;
  };
}
