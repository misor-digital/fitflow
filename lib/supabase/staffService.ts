/**
 * Staff Management Service
 * Handles staff user creation, role assignment, and management
 * Part of Phase 2: Customer Accounts + Staff Foundation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface CreateStaffUserParams {
  email: string;
  fullName: string;
  roleNames: string[]; // Array of role names to assign
  createdBy?: string; // Staff user ID who created this user
}

export interface CreateStaffUserResult {
  success: boolean;
  error?: string;
  staffUser?: any;
  authUser?: any;
  onboardingToken?: string;
}

export interface AssignRoleResult {
  success: boolean;
  error?: string;
}

export interface StaffUserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  requires_password_reset: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
    assigned_at: string;
  }>;
}

/**
 * Create a new staff user with initial roles
 * Only callable by super_admin via service role
 */
export async function createStaffUser(
  params: CreateStaffUserParams
): Promise<CreateStaffUserResult> {
  const supabase = getServiceClient();
  
  try {
    // 1. Create auth.users entry (no password yet)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      email_confirm: false, // Will confirm via onboarding link
      user_metadata: {
        full_name: params.fullName,
        is_staff: true,
      },
    });
    
    if (authError || !authData.user) {
      console.error('Failed to create auth user:', authError);
      return { success: false, error: authError?.message || 'Failed to create auth user' };
    }
    
    // 2. Create staff_users entry
    const { data: staffData, error: staffError } = await supabase
      .from('staff_users')
      .insert({
        user_id: authData.user.id,
        full_name: params.fullName,
        email: params.email,
        is_active: true,
        requires_password_reset: true,
      } as any)
      .select()
      .single();
    
    if (staffError || !staffData) {
      console.error('Failed to create staff user:', staffError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: staffError?.message || 'Failed to create staff user' };
    }
    
    // 3. Assign roles
    const roleAssignmentErrors: string[] = [];
    for (const roleName of params.roleNames) {
      // Get role ID by name
      const { data: role } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single();
      
      if (!role) {
        roleAssignmentErrors.push(`Role not found: ${roleName}`);
        continue;
      }
      
      // Get createdBy staff_user_id if provided
      let assignedByStaffId: string | null = null;
      if (params.createdBy) {
        const { data: createdByStaff } = await supabase
          .from('staff_users')
          .select('id')
          .eq('user_id', params.createdBy)
          .single();
        
        assignedByStaffId = createdByStaff?.id || null;
      }
      
      // Assign role
      const { error: assignError } = await supabase
        .from('staff_role_assignments')
        .insert({
          staff_user_id: staffData.id,
          role_id: role.id,
          assigned_by: assignedByStaffId,
        } as any);
      
      if (assignError) {
        roleAssignmentErrors.push(`Failed to assign role ${roleName}: ${assignError.message}`);
      }
    }
    
    // 4. Generate onboarding token (magic link for password setup)
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: params.email,
    });
    
    if (tokenError) {
      console.error('Failed to generate onboarding token:', tokenError);
    }
    
    return {
      success: true,
      staffUser: staffData,
      authUser: authData.user,
      onboardingToken: tokenData?.properties?.hashed_token,
    };
  } catch (error) {
    console.error('Error creating staff user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get staff user with their roles
 */
export async function getStaffUserWithRoles(
  userId: string
): Promise<StaffUserWithRoles | null> {
  const supabase = getServiceClient();
  
  const { data: staffUser } = await supabase
    .from('staff_users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!staffUser) {
    return null;
  }
  
  const { data: roleAssignments } = await supabase
    .from('staff_role_assignments')
    .select(`
      assigned_at,
      roles (
        id,
        name,
        description
      )
    `)
    .eq('staff_user_id', staffUser.id);
  
  const roles = (roleAssignments || []).map((assignment: any) => ({
    id: assignment.roles.id,
    name: assignment.roles.name,
    description: assignment.roles.description,
    assigned_at: assignment.assigned_at,
  }));
  
  return {
    ...staffUser,
    roles,
  };
}

/**
 * Assign a role to a staff user
 */
export async function assignRoleToStaffUser(
  staffUserId: string,
  roleName: string,
  assignedBy?: string
): Promise<AssignRoleResult> {
  const supabase = getServiceClient();
  
  // Get role ID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();
  
  if (roleError || !role) {
    return { success: false, error: `Role not found: ${roleName}` };
  }
  
  // Get staff_user record
  const { data: staffUser, error: staffError } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', staffUserId)
    .single();
  
  if (staffError || !staffUser) {
    return { success: false, error: 'Staff user not found' };
  }
  
  // Get assignedBy staff_user_id if provided
  let assignedByStaffId: string | null = null;
  if (assignedBy) {
    const { data: assignedByStaff } = await supabase
      .from('staff_users')
      .select('id')
      .eq('user_id', assignedBy)
      .single();
    
    assignedByStaffId = assignedByStaff?.id || null;
  }
  
  // Assign role
  const { error: assignError } = await supabase
    .from('staff_role_assignments')
    .insert({
      staff_user_id: staffUser.id,
      role_id: role.id,
      assigned_by: assignedByStaffId,
    } as any);
  
  if (assignError) {
    // Check if it's a duplicate
    if (assignError.code === '23505') {
      return { success: false, error: 'Role already assigned' };
    }
    return { success: false, error: assignError.message };
  }
  
  return { success: true };
}

/**
 * Remove a role from a staff user
 */
export async function removeRoleFromStaffUser(
  staffUserId: string,
  roleName: string
): Promise<AssignRoleResult> {
  const supabase = getServiceClient();
  
  // Get role ID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();
  
  if (roleError || !role) {
    return { success: false, error: `Role not found: ${roleName}` };
  }
  
  // Get staff_user record
  const { data: staffUser, error: staffError } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', staffUserId)
    .single();
  
  if (staffError || !staffUser) {
    return { success: false, error: 'Staff user not found' };
  }
  
  // Remove role
  const { error: removeError } = await supabase
    .from('staff_role_assignments')
    .delete()
    .eq('staff_user_id', staffUser.id)
    .eq('role_id', role.id);
  
  if (removeError) {
    return { success: false, error: removeError.message };
  }
  
  return { success: true };
}

/**
 * Disable a staff user (soft delete)
 */
export async function disableStaffUser(
  staffUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from('staff_users')
    .update({ is_active: false } as any)
    .eq('user_id', staffUserId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Enable a staff user
 */
export async function enableStaffUser(
  staffUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from('staff_users')
    .update({ is_active: true } as any)
    .eq('user_id', staffUserId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * List all staff users with their roles
 */
export async function listAllStaffUsers(): Promise<StaffUserWithRoles[]> {
  const supabase = getServiceClient();
  
  const { data: staffUsers } = await supabase
    .from('staff_users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (!staffUsers) {
    return [];
  }
  
  const usersWithRoles = await Promise.all(
    staffUsers.map(async (user) => {
      const { data: roleAssignments } = await supabase
        .from('staff_role_assignments')
        .select(`
          assigned_at,
          roles (
            id,
            name,
            description
          )
        `)
        .eq('staff_user_id', user.id);
      
      const roles = (roleAssignments || []).map((assignment: any) => ({
        id: assignment.roles.id,
        name: assignment.roles.name,
        description: assignment.roles.description,
        assigned_at: assignment.assigned_at,
      }));
      
      return {
        ...user,
        roles,
      };
    })
  );
  
  return usersWithRoles;
}

/**
 * Check if user has super_admin role
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  
  const { data } = await supabase.rpc('has_role', {
    p_user_id: userId,
    p_role_name: 'super_admin',
  } as any);
  
  return data === true;
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
  const supabase = getServiceClient();
  
  const { data } = await supabase.rpc('has_any_role', {
    p_user_id: userId,
    p_role_names: roleNames,
  } as any);
  
  return data === true;
}
