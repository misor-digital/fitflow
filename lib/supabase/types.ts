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
  // GDPR email consent (added in Phase E1)
  email_consent: boolean;
  email_consent_at: string | null;
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
  max_uses_per_user: number | null;
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
  max_uses_per_user?: number | null;
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
  max_uses_per_user?: number | null;
}

export interface PromoCodeUsageRow {
  id: string;
  promo_code_id: string;
  user_id: string;
  order_id: string | null;
  used_at: string;
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
  // Speedy office delivery fields (present when delivery_method = 'speedy_office')
  delivery_method?: 'address' | 'speedy_office';
  speedy_office_id?: string;
  speedy_office_name?: string;
  speedy_office_address?: string;
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
  delivery_method: 'address' | 'speedy_office';
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
  subscription_id: string | null;
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
  delivery_method?: 'address' | 'speedy_office';
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
  subscription_id?: string | null;
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
// Subscription Types
// ============================================================================

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  box_type: string;
  status: SubscriptionStatus;
  frequency: string;                // 'monthly' | 'seasonal'
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
  base_price_eur: number;
  current_price_eur: number;
  default_address_id: string | null;
  started_at: string;
  first_cycle_id: string | null;
  last_delivered_cycle_id: string | null;
  paused_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInsert {
  user_id: string;
  box_type: string;
  status?: SubscriptionStatus;
  frequency?: string;
  wants_personalization?: boolean;
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
  base_price_eur: number;
  current_price_eur: number;
  default_address_id?: string | null;
  first_cycle_id?: string | null;
}

export interface SubscriptionUpdate {
  status?: SubscriptionStatus;
  frequency?: string;
  wants_personalization?: boolean;
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
  default_address_id?: string | null;
  first_cycle_id?: string | null;
  last_delivered_cycle_id?: string | null;
  paused_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

export interface SubscriptionHistoryRow {
  id: string;
  subscription_id: string;
  action: string;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export interface SubscriptionHistoryInsert {
  subscription_id: string;
  action: string;
  details?: Record<string, unknown> | null;
  performed_by?: string | null;
}

// ============================================================================
// Email Campaign Types
// ============================================================================

export type EmailCampaignTypeEnum = 'one-off' | 'promotional' | 'lifecycle';
export type EmailCampaignStatusEnum = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
export type EmailRecipientStatusEnum = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'skipped';
export type EmailLogStatusEnum = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'spam' | 'blocked';
export type TargetListTypeEnum = 'preorder-holders' | 'subscribers' | 'all-customers' | 'custom-list';

export interface EmailCampaignRow {
  id: string;
  name: string;
  subject: string;
  template_id: number | null;
  html_content: string | null;
  campaign_type: EmailCampaignTypeEnum;
  status: EmailCampaignStatusEnum;
  target_list_type: TargetListTypeEnum;
  target_filter: Record<string, unknown>;
  params: Record<string, unknown>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  brevo_campaign_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignInsert {
  name: string;
  subject: string;
  template_id?: number | null;
  html_content?: string | null;
  campaign_type: EmailCampaignTypeEnum;
  target_list_type: TargetListTypeEnum;
  target_filter?: Record<string, unknown>;
  params?: Record<string, unknown>;
  scheduled_at?: string | null;
  brevo_campaign_id?: string | null;
  created_by: string;
}

export interface EmailCampaignUpdate {
  name?: string;
  subject?: string;
  template_id?: number | null;
  html_content?: string | null;
  status?: EmailCampaignStatusEnum;
  target_filter?: Record<string, unknown>;
  params?: Record<string, unknown>;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  brevo_campaign_id?: string | null;
  updated_by?: string;
}

export interface EmailCampaignRecipientRow {
  id: string;
  campaign_id: string;
  email: string;
  full_name: string | null;
  preorder_id: string | null;
  params: Record<string, unknown>;
  status: EmailRecipientStatusEnum;
  brevo_message_id: string | null;
  sent_at: string | null;
  error: string | null;
  variant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignRecipientInsert {
  campaign_id: string;
  email: string;
  full_name?: string | null;
  preorder_id?: string | null;
  params?: Record<string, unknown>;
  variant_id?: string | null;
}

export interface EmailCampaignHistoryRow {
  id: string;
  campaign_id: string;
  action: string;
  changed_by: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EmailCampaignHistoryInsert {
  campaign_id: string;
  action: string;
  changed_by: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface EmailSendLogRow {
  id: string;
  email_type: 'transactional' | 'campaign';
  email_category: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  template_id: number | null;
  brevo_message_id: string | null;
  campaign_id: string | null;
  status: EmailLogStatusEnum;
  params: Record<string, unknown> | null;
  error: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  unsubscribed_at: string | null;
  webhook_events: unknown[];
  created_at: string;
}

export interface EmailSendLogInsert {
  email_type: 'transactional' | 'campaign';
  email_category: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject?: string | null;
  template_id?: number | null;
  brevo_message_id?: string | null;
  campaign_id?: string | null;
  status?: EmailLogStatusEnum;
  params?: Record<string, unknown> | null;
  error?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  unsubscribed_at?: string | null;
  webhook_events?: unknown[];
}

export interface EmailMonthlyUsageRow {
  month: string;
  transactional_sent: number;
  campaign_sent: number;
  total_sent: number;
  monthly_limit: number;
  alert_sent_80: boolean;
  alert_sent_95: boolean;
}

// ============================================================================
// Email A/B Variant Types
// ============================================================================

export interface EmailABVariantRow {
  id: string;
  campaign_id: string;
  variant_label: string;
  subject: string | null;
  template_id: number | null;
  params: Record<string, unknown>;
  recipient_percentage: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
}

export interface EmailABVariantInsert {
  campaign_id: string;
  variant_label: string;
  subject?: string | null;
  template_id?: number | null;
  params?: Record<string, unknown>;
  recipient_percentage: number;
}

export interface EmailABVariantUpdate {
  variant_label?: string;
  subject?: string | null;
  template_id?: number | null;
  params?: Record<string, unknown>;
  recipient_percentage?: number;
  sent_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
}

// ============================================================================
// Email Unsubscribe Types
// ============================================================================

export interface EmailUnsubscribeRow {
  id: string;
  email: string;
  source: string;
  campaign_id: string | null;
  reason: string | null;
  unsubscribed_at: string;
}

export interface EmailUnsubscribeInsert {
  email: string;
  source?: string;
  campaign_id?: string | null;
  reason?: string | null;
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
          email_consent?: boolean;
          email_consent_at?: string | null;
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
      promo_code_usages: {
        Row: ToRecord<PromoCodeUsageRow>;
        Insert: Omit<ToRecord<PromoCodeUsageRow>, 'id' | 'used_at'> & { id?: string; used_at?: string };
        Update: Partial<ToRecord<PromoCodeUsageRow>>;
        Relationships: [
          {
            foreignKeyName: 'promo_code_usages_promo_code_id_fkey';
            columns: ['promo_code_id'];
            referencedRelation: 'promo_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promo_code_usages_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promo_code_usages_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ];
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
        }, {
          foreignKeyName: 'orders_subscription_id_fkey';
          columns: ['subscription_id'];
          referencedRelation: 'subscriptions';
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
      subscriptions: {
        Row: ToRecord<SubscriptionRow>;
        Insert: ToRecord<SubscriptionInsert>;
        Update: ToRecord<SubscriptionUpdate>;
        Relationships: [{
          foreignKeyName: 'subscriptions_user_id_fkey';
          columns: ['user_id'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'subscriptions_default_address_id_fkey';
          columns: ['default_address_id'];
          referencedRelation: 'addresses';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'subscriptions_first_cycle_id_fkey';
          columns: ['first_cycle_id'];
          referencedRelation: 'delivery_cycles';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'subscriptions_last_delivered_cycle_id_fkey';
          columns: ['last_delivered_cycle_id'];
          referencedRelation: 'delivery_cycles';
          referencedColumns: ['id'];
        }];
      };
      subscription_history: {
        Row: ToRecord<SubscriptionHistoryRow>;
        Insert: ToRecord<SubscriptionHistoryInsert>;
        Update: ToRecord<Partial<SubscriptionHistoryInsert>>;
        Relationships: [{
          foreignKeyName: 'subscription_history_subscription_id_fkey';
          columns: ['subscription_id'];
          referencedRelation: 'subscriptions';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'subscription_history_performed_by_fkey';
          columns: ['performed_by'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }];
      };
      email_campaigns: {
        Row: ToRecord<EmailCampaignRow>;
        Insert: ToRecord<EmailCampaignInsert>;
        Update: ToRecord<EmailCampaignUpdate>;
        Relationships: [{
          foreignKeyName: 'email_campaigns_created_by_fkey';
          columns: ['created_by'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'email_campaigns_updated_by_fkey';
          columns: ['updated_by'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }];
      };
      email_campaign_recipients: {
        Row: ToRecord<EmailCampaignRecipientRow>;
        Insert: ToRecord<EmailCampaignRecipientInsert>;
        Update: ToRecord<Partial<EmailCampaignRecipientInsert> & {
          status?: EmailRecipientStatusEnum;
          brevo_message_id?: string | null;
          sent_at?: string | null;
          error?: string | null;
        }>;
        Relationships: [{
          foreignKeyName: 'email_campaign_recipients_campaign_id_fkey';
          columns: ['campaign_id'];
          referencedRelation: 'email_campaigns';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'email_campaign_recipients_preorder_id_fkey';
          columns: ['preorder_id'];
          referencedRelation: 'preorders';
          referencedColumns: ['id'];
        }];
      };
      email_campaign_history: {
        Row: ToRecord<EmailCampaignHistoryRow>;
        Insert: ToRecord<EmailCampaignHistoryInsert>;
        Update: ToRecord<Partial<EmailCampaignHistoryInsert>>;
        Relationships: [{
          foreignKeyName: 'email_campaign_history_campaign_id_fkey';
          columns: ['campaign_id'];
          referencedRelation: 'email_campaigns';
          referencedColumns: ['id'];
        }, {
          foreignKeyName: 'email_campaign_history_changed_by_fkey';
          columns: ['changed_by'];
          referencedRelation: 'users';
          referencedColumns: ['id'];
        }];
      };
      email_send_log: {
        Row: ToRecord<EmailSendLogRow>;
        Insert: ToRecord<EmailSendLogInsert>;
        Update: ToRecord<Partial<EmailSendLogInsert>>;
        Relationships: [{
          foreignKeyName: 'email_send_log_campaign_id_fkey';
          columns: ['campaign_id'];
          referencedRelation: 'email_campaigns';
          referencedColumns: ['id'];
        }];
      };
      email_monthly_usage: {
        Row: ToRecord<EmailMonthlyUsageRow>;
        Insert: ToRecord<Omit<EmailMonthlyUsageRow, 'total_sent'>>;
        Update: ToRecord<Partial<Omit<EmailMonthlyUsageRow, 'total_sent'>>>;
        Relationships: [];
      };
      email_ab_variants: {
        Row: ToRecord<EmailABVariantRow>;
        Insert: ToRecord<EmailABVariantInsert>;
        Update: ToRecord<EmailABVariantUpdate>;
        Relationships: [{
          foreignKeyName: 'email_ab_variants_campaign_id_fkey';
          columns: ['campaign_id'];
          referencedRelation: 'email_campaigns';
          referencedColumns: ['id'];
        }];
      };
      email_unsubscribes: {
        Row: ToRecord<EmailUnsubscribeRow>;
        Insert: ToRecord<EmailUnsubscribeInsert>;
        Update: ToRecord<Partial<EmailUnsubscribeInsert>>;
        Relationships: [{
          foreignKeyName: 'email_unsubscribes_campaign_id_fkey';
          columns: ['campaign_id'];
          referencedRelation: 'email_campaigns';
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
        Args: { p_code: string; p_user_id?: string; p_order_id?: string };
        Returns: undefined;
      };
      check_user_promo_usage: {
        Args: { p_code: string; p_user_id: string };
        Returns: number;
      };
      increment_email_usage: {
        Args: { p_type: string; p_count?: number };
        Returns: { current_total: number; current_limit: number; is_over_limit: boolean }[];
      };
    };
    Enums: {
      box_type: BoxType;
      user_type: UserType;
      staff_role: StaffRole;
      order_status: OrderStatus;
      preorder_conversion_status: PreorderConversionStatus;
      delivery_cycle_status: DeliveryCycleStatus;
      subscription_status: SubscriptionStatus;
      email_campaign_type: EmailCampaignTypeEnum;
      email_campaign_status: EmailCampaignStatusEnum;
      email_recipient_status: EmailRecipientStatusEnum;
      email_log_status: EmailLogStatusEnum;
      target_list_type: TargetListTypeEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
