/**
 * Domain Layer - Database Type Aliases
 * 
 * This file provides derived type aliases from Supabase generated types.
 * These types represent the raw database schema and serve as the foundation
 * for the domain layer.
 * 
 * DO NOT manually edit these types - they are derived from the database schema.
 * To update, regenerate Supabase types using: pnpm gen:types
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/lib/supabase/types';

// ============================================================================
// TABLE ROW TYPES
// ============================================================================

/**
 * Preorder table row type
 */
export type PreorderRow = Tables<'preorders'>;

/**
 * Box type table row type
 */
export type BoxTypeRow = Tables<'box_types'>;

/**
 * Promo code table row type
 */
export type PromoCodeRow = Tables<'promo_codes'>;

/**
 * Customer table row type
 */
export type CustomerRow = Tables<'customers'>;

/**
 * Option table row type
 */
export type OptionRow = Tables<'options'>;

/**
 * Newsletter subscription table row type
 */
export type NewsletterSubscriptionRow = Tables<'newsletter_subscriptions'>;

/**
 * Staff user table row type
 */
export type StaffUserRow = Tables<'staff_users'>;

/**
 * Role table row type
 */
export type RoleRow = Tables<'roles'>;

/**
 * Staff role assignment table row type
 */
export type StaffRoleAssignmentRow = Tables<'staff_role_assignments'>;

// ============================================================================
// TABLE INSERT TYPES
// ============================================================================

/**
 * Preorder insert type
 */
export type PreorderInsert = TablesInsert<'preorders'>;

/**
 * Box type insert type
 */
export type BoxTypeInsert = TablesInsert<'box_types'>;

/**
 * Promo code insert type
 */
export type PromoCodeInsert = TablesInsert<'promo_codes'>;

/**
 * Customer insert type
 */
export type CustomerInsert = TablesInsert<'customers'>;

/**
 * Option insert type
 */
export type OptionInsert = TablesInsert<'options'>;

/**
 * Newsletter subscription insert type
 */
export type NewsletterSubscriptionInsert = TablesInsert<'newsletter_subscriptions'>;

/**
 * Staff user insert type
 */
export type StaffUserInsert = TablesInsert<'staff_users'>;

/**
 * Role insert type
 */
export type RoleInsert = TablesInsert<'roles'>;

/**
 * Staff role assignment insert type
 */
export type StaffRoleAssignmentInsert = TablesInsert<'staff_role_assignments'>;

// ============================================================================
// TABLE UPDATE TYPES
// ============================================================================

/**
 * Preorder update type
 */
export type PreorderUpdate = TablesUpdate<'preorders'>;

/**
 * Box type update type
 */
export type BoxTypeUpdate = TablesUpdate<'box_types'>;

/**
 * Promo code update type
 */
export type PromoCodeUpdate = TablesUpdate<'promo_codes'>;

/**
 * Customer update type
 */
export type CustomerUpdate = TablesUpdate<'customers'>;

/**
 * Option update type
 */
export type OptionUpdate = TablesUpdate<'options'>;

/**
 * Newsletter subscription update type
 */
export type NewsletterSubscriptionUpdate = TablesUpdate<'newsletter_subscriptions'>;

/**
 * Staff user update type
 */
export type StaffUserUpdate = TablesUpdate<'staff_users'>;

/**
 * Role update type
 */
export type RoleUpdate = TablesUpdate<'roles'>;

/**
 * Staff role assignment update type
 */
export type StaffRoleAssignmentUpdate = TablesUpdate<'staff_role_assignments'>;

// ============================================================================
// ENUM TYPES
// ============================================================================

/**
 * Box type enum
 */
export type BoxType = Enums<'box_type'>;

/**
 * Actor type enum
 */
export type ActorType = Enums<'actor_type'>;

/**
 * Subscription status enum
 */
export type SubscriptionStatus = Enums<'subscription_status'>;
