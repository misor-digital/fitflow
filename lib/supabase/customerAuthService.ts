/**
 * Customer Authentication Service
 * 
 * Handles customer-specific authentication operations:
 * - Sign up
 * - Sign in
 * - Sign out
 * - Password reset
 * - Email verification
 * 
 * Uses cookie-based sessions via SSR client.
 */

import { createClient } from './server';
import { supabase as adminClient } from './client';
import type { CustomerInsert } from '@/lib/domain';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  preferredLanguage?: 'bg' | 'en';
  marketingConsent?: boolean;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  newPassword: string;
}

/**
 * Sign up a new customer
 * Creates both auth.users record and customers record
 */
export async function signUp(data: SignUpData) {
  const supabase = await createClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return {
      data: null,
      error: authError || new Error('Failed to create user'),
    };
  }

  // 2. Create customer record using admin client (bypasses RLS)
  const customerData: CustomerInsert = {
    user_id: authData.user.id,
    full_name: data.fullName,
    phone: data.phone || null,
    preferred_language: data.preferredLanguage || 'bg',
    marketing_consent: data.marketingConsent || false,
    marketing_consent_date: data.marketingConsent ? new Date().toISOString() : null,
  };

  const { error: customerError } = await adminClient
    .from('customers')
    .insert(customerData);

  if (customerError) {
    // Rollback: delete auth user if customer creation fails
    await adminClient.auth.admin.deleteUser(authData.user.id);
    
    return {
      data: null,
      error: new Error('Failed to create customer profile'),
    };
  }

  return {
    data: {
      user: authData.user,
      session: authData.session,
    },
    error: null,
  };
}

/**
 * Sign in an existing customer
 */
export async function signIn(data: SignInData) {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (authError || !authData.user) {
    return {
      data: null,
      error: authError || new Error('Invalid credentials'),
    };
  }

  // Verify customer record exists
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, user_id')
    .eq('user_id', authData.user.id)
    .single();

  if (customerError || !customer) {
    // Sign out if no customer record
    await supabase.auth.signOut();
    return {
      data: null,
      error: new Error('Customer profile not found'),
    };
  }

  return {
    data: {
      user: authData.user,
      session: authData.session,
    },
    error: null,
  };
}

/**
 * Sign out the current customer
 */
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(data: ResetPasswordData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account/reset-password`,
  });

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Update password (must be called with valid session)
 */
export async function updatePassword(data: UpdatePasswordData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  });

  if (error || !data.user) {
    return {
      data: null,
      error: error || new Error('Invalid verification token'),
    };
  }

  return {
    data: {
      user: data.user,
      session: data.session,
    },
    error: null,
  };
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Request magic link for sign in (passwordless)
 */
export async function requestMagicLinkSignIn(email: string, redirectTo?: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL}/account/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Request magic link for sign up (passwordless)
 */
export async function requestMagicLinkSignUp(
  email: string,
  fullName: string,
  phone?: string,
  preferredLanguage?: 'bg' | 'en',
  marketingConsent?: boolean,
  redirectTo?: string
) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL}/account/auth/callback`,
      data: {
        full_name: fullName,
        phone: phone || null,
        preferred_language: preferredLanguage || 'bg',
        marketing_consent: marketingConsent || false,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Ensure customer profile exists for authenticated user
 * Creates customer record if missing (for magic link users)
 */
export async function ensureCustomerProfile(
  userId: string,
  fullName: string,
  phone?: string,
  preferredLanguage?: 'bg' | 'en',
  marketingConsent?: boolean
) {
  // Check if customer profile exists
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return {
      success: true,
      error: null,
    };
  }

  // Create customer profile using admin client (bypasses RLS)
  const customerData: CustomerInsert = {
    user_id: userId,
    full_name: fullName,
    phone: phone || null,
    preferred_language: preferredLanguage || 'bg',
    marketing_consent: marketingConsent || false,
    marketing_consent_date: marketingConsent ? new Date().toISOString() : null,
  };

  const { error } = await adminClient
    .from('customers')
    .insert(customerData);

  if (error) {
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Check if email belongs to a staff user
 * Returns true if email is @fitflow.bg and exists in staff_users table
 */
export async function isStaffEmail(email: string): Promise<boolean> {
  // Only check if email is @fitflow.bg domain
  if (!email.toLowerCase().endsWith('@fitflow.bg')) {
    return false;
  }

  try {
    // Query staff_users table by email (staff_users stores email in auth.users)
    // We need to join with auth.users to get the email
    const { data: staffUsers, error: staffError } = await adminClient
      .from('staff_users')
      .select('user_id')
      .limit(100);

    if (staffError || !staffUsers) {
      return false;
    }

    // For each staff user, check if their auth email matches
    for (const staffUser of staffUsers) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(staffUser.user_id);
      if (authUser?.user?.email?.toLowerCase() === email.toLowerCase()) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
