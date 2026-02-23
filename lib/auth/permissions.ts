import 'server-only';
import type { StaffRole } from '@/lib/supabase/types';

/**
 * Staff role hierarchy — higher index = more permission.
 * Used for "can user X manage user Y" checks.
 */
const ROLE_HIERARCHY: Record<StaffRole, number> = {
  analyst: 1,
  content: 1,
  support: 2,
  finance: 2,
  warehouse: 2,
  marketing: 3,
  manager: 4,
  admin: 5,
  super_admin: 6,
};

/**
 * Check if a role outranks another role.
 */
export function outranks(actor: StaffRole, target: StaffRole): boolean {
  return ROLE_HIERARCHY[actor] > ROLE_HIERARCHY[target];
}

/**
 * Check if a role has at least the given minimum level.
 */
export function hasMinimumRole(role: StaffRole, minimum: StaffRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

/**
 * Roles that can access the admin panel.
 */
export const ADMIN_PANEL_ROLES: ReadonlySet<StaffRole> = new Set([
  'super_admin',
  'admin',
  'manager',
  'marketing',
  'support',
  'finance',
  'content',
  'analyst',
  'warehouse',
]);

/**
 * Roles that can manage other staff members.
 */
export const STAFF_MANAGEMENT_ROLES: ReadonlySet<StaffRole> = new Set([
  'super_admin',
  'admin',
]);

/**
 * Roles that can view orders/preorders.
 */
export const ORDER_VIEW_ROLES: ReadonlySet<StaffRole> = new Set([
  'super_admin',
  'admin',
  'manager',
  'support',
  'warehouse',
]);
