export type BoxTypeId = 
  | 'monthly-standard' 
  | 'monthly-premium' 
  | 'monthly-premium-monthly' 
  | 'monthly-premium-seasonal' 
  | 'one-time-standard' 
  | 'one-time-premium'
  | 'onetime-standard' 
  | 'onetime-premium';

export interface PreorderInsert {
  full_name: string;
  email: string;
  phone?: string | null;
  box_type: BoxTypeId;
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
  created_at: string;
  updated_at: string;
}

// Box type row from database
export interface BoxTypeRow {
  id: string;
  name: string;
  description: string | null;
  category: 'monthly' | 'one-time';
  tier: 'standard' | 'premium';
  price_eur: number;
  is_subscription: boolean;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Promo code row from database
export interface PromoCodeRow {
  id: string;
  code: string;
  discount_percent: number;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  ends_at: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Option row from database
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

// Option set row from database
export interface OptionSetRow {
  id: string;
  name: string;
  description: string | null;
  allow_multiple: boolean;
  allow_other: boolean;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Site config row from database
export interface SiteConfigRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

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
        Insert: Omit<BoxTypeRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<BoxTypeRow>;
        Relationships: [];
      };
      promo_codes: {
        Row: PromoCodeRow;
        Insert: Omit<PromoCodeRow, 'id' | 'created_at' | 'updated_at' | 'current_uses'> & { id?: string; created_at?: string; updated_at?: string; current_uses?: number };
        Update: Partial<PromoCodeRow>;
        Relationships: [];
      };
      option_sets: {
        Row: OptionSetRow;
        Insert: Omit<OptionSetRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<OptionSetRow>;
        Relationships: [];
      };
      options: {
        Row: OptionRow;
        Insert: Omit<OptionRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<OptionRow>;
        Relationships: [];
      };
      site_config: {
        Row: SiteConfigRow;
        Insert: Omit<SiteConfigRow, 'updated_at'> & { updated_at?: string };
        Update: Partial<SiteConfigRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      box_type: BoxTypeId;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Re-export convenience types
export type BoxType = BoxTypeRow;
export type PromoCode = PromoCodeRow;
export type Option = OptionRow;
export type OptionSet = OptionSetRow;
export type SiteConfig = SiteConfigRow;
