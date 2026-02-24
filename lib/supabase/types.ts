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

export type PreorderConversionStatus = 'pending' | 'converted' | 'expired';

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
  // Linking
  user_id?: string | null;
}

export interface Preorder extends PreorderInsert {
  id: string;
  order_id: string;
  user_id: string | null;
  // Conversion tracking (added in Phase 1)
  conversion_token: string | null;
  conversion_token_expires_at: string | null;
  conversion_status: PreorderConversionStatus;
  converted_to_order_id: string | null;
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
// Addresses Table
// ============================================================================

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface ShippingAddressSnapshot {
  full_name: string;
  phone: string | null;
  city: string;
  postal_code: string;
  street_address: string;
  building_entrance: string | null;
  floor: string | null;
  apartment: string | null;
  delivery_notes: string | null;
}

export interface AddressRow {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone: string | null;
  city: string;
  postal_code: string;
  street_address: string;
  building_entrance: string | null;
  floor: string | null;
  apartment: string | null;
  delivery_notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressInsert {
  user_id: string;
  label?: string | null;
  full_name: string;
  phone?: string | null;
  city: string;
  postal_code: string;
  street_address: string;
  building_entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
  delivery_notes?: string | null;
  is_default?: boolean;
}

export interface AddressUpdate {
  label?: string | null;
  full_name?: string;
  phone?: string | null;
  city?: string;
  postal_code?: string;
  street_address?: string;
  building_entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
  delivery_notes?: string | null;
  is_default?: boolean;
}

// ============================================================================
// Orders Table
// ============================================================================

// Order type discriminator
export type OrderType = 'subscription' | 'onetime-mystery' | 'onetime-revealed' | 'direct';

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string;
  customer_full_name: string;
  customer_phone: string | null;
  shipping_address: ShippingAddressSnapshot;
  address_id: string | null;
  box_type: string;
  wants_personalization: boolean;
  sports: string[] | null;
  sport_other: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavor_other: string | null;
  dietary: string[] | null;
  dietary_other: string | null;
  size_upper: string | null;
  size_lower: string | null;
  additional_notes: string | null;
  promo_code: string | null;
  discount_percent: number | null;
  original_price_eur: number | null;
  final_price_eur: number | null;
  status: OrderStatus;
  delivery_cycle_id: string | null;
  order_type: string; // OrderType
  converted_from_preorder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderInsert {
  user_id?: string | null;
  customer_email: string;
  customer_full_name: string;
  customer_phone?: string | null;
  shipping_address: ShippingAddressSnapshot;
  address_id?: string | null;
  box_type: string;
  wants_personalization: boolean;
  sports?: string[] | null;
  sport_other?: string | null;
  colors?: string[] | null;
  flavors?: string[] | null;
  flavor_other?: string | null;
  dietary?: string[] | null;
  dietary_other?: string | null;
  size_upper?: string | null;
  size_lower?: string | null;
  additional_notes?: string | null;
  promo_code?: string | null;
  discount_percent?: number | null;
  original_price_eur?: number | null;
  final_price_eur?: number | null;
  status?: OrderStatus;
  converted_from_preorder_id?: string | null;
  delivery_cycle_id?: string | null;
  order_type?: string;
}

export interface OrderUpdate {
  status?: OrderStatus;
  shipping_address?: ShippingAddressSnapshot;
  address_id?: string | null;
}

// ============================================================================
// Order Status History Table
// ============================================================================

export interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderStatusHistoryInsert {
  order_id: string;
  from_status?: OrderStatus | null;
  to_status: OrderStatus;
  changed_by?: string | null;
  notes?: string | null;
}

// ============================================================================
// Delivery Cycle Types
// ============================================================================

export type DeliveryCycleStatus = 'upcoming' | 'delivered' | 'archived';

export interface DeliveryCycleRow {
  id: string;
  delivery_date: string;        // DATE as ISO string
  status: DeliveryCycleStatus;
  title: string | null;
  description: string | null;
  is_revealed: boolean;
  revealed_at: string | null;   // TIMESTAMPTZ as ISO string
  created_at: string;
  updated_at: string;
}

export interface DeliveryCycleInsert {
  delivery_date: string;
  status?: DeliveryCycleStatus;
  title?: string | null;
  description?: string | null;
  is_revealed?: boolean;
}

export interface DeliveryCycleUpdate {
  delivery_date?: string;
  status?: DeliveryCycleStatus;
  title?: string | null;
  description?: string | null;
  is_revealed?: boolean;
  revealed_at?: string | null;
}

export interface DeliveryCycleItemRow {
  id: string;
  delivery_cycle_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryCycleItemInsert {
  delivery_cycle_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  sort_order?: number;
}

export interface DeliveryCycleItemUpdate {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  sort_order?: number;
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
        Update: ToRecord<Partial<PreorderInsert> & {
          conversion_token?: string | null;
          conversion_token_expires_at?: string | null;
          conversion_status?: PreorderConversionStatus;
          converted_to_order_id?: string | null;
        }>;
        Relationships: [{
          foreignKeyName: 'preorders_converted_to_order_id_fkey';
          columns: ['converted_to_order_id'];
          referencedRelation: 'orders';
          referencedColumns: ['id'];
        }];
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
      addresses: {
        Row: ToRecord<AddressRow>;
        Insert: ToRecord<AddressInsert>;
        Update: ToRecord<AddressUpdate>;
        Relationships: [{
          foreignKeyName: 'addresses_user_id_fkey';
          columns: ['user_id'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }];
      };
      orders: {
        Row: ToRecord<OrderRow>;
        Insert: ToRecord<OrderInsert>;
        Update: ToRecord<OrderUpdate>;
        Relationships: [{
          foreignKeyName: 'orders_user_id_fkey';
          columns: ['user_id'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'orders_address_id_fkey';
          columns: ['address_id'];
          referencedRelation: 'addresses';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'orders_converted_from_preorder_id_fkey';
          columns: ['converted_from_preorder_id'];
          referencedRelation: 'preorders';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'orders_delivery_cycle_id_fkey';
          columns: ['delivery_cycle_id'];
          referencedRelation: 'delivery_cycles';
          referencedColumns: ['id'];
        }];
      };
      delivery_cycles: {
        Row: ToRecord<DeliveryCycleRow>;
        Insert: ToRecord<DeliveryCycleInsert>;
        Update: ToRecord<DeliveryCycleUpdate>;
        Relationships: [];
      };
      delivery_cycle_items: {
        Row: ToRecord<DeliveryCycleItemRow>;
        Insert: ToRecord<DeliveryCycleItemInsert>;
        Update: ToRecord<DeliveryCycleItemUpdate>;
        Relationships: [{
          foreignKeyName: 'delivery_cycle_items_delivery_cycle_id_fkey';
          columns: ['delivery_cycle_id'];
          referencedRelation: 'delivery_cycles';
          referencedColumns: ['id'];
        }];
      };
      order_status_history: {
        Row: ToRecord<OrderStatusHistoryRow>;
        Insert: ToRecord<OrderStatusHistoryInsert>;
        Update: ToRecord<Partial<OrderStatusHistoryInsert>>;
        Relationships: [{
          foreignKeyName: 'order_status_history_order_id_fkey';
          columns: ['order_id'];
          referencedRelation: 'orders';
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
      increment_promo_usage: {
        Args: { p_code: string };
        Returns: void;
      };
    };
    Enums: {
      box_type: BoxType;
      user_type: UserType;
      staff_role: StaffRole;
      order_status: OrderStatus;
      preorder_conversion_status: PreorderConversionStatus;
      delivery_cycle_status: DeliveryCycleStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
