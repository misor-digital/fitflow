/**
 * Authentication and Authorization Types
 */

import type { User } from '@supabase/supabase-js';

/**
 * User roles for authorization
 */
export type UserRole = 'admin' | 'ops' | 'marketing';

/**
 * User with roles attached
 */
export interface UserWithRoles extends User {
  roles: UserRole[];
}

/**
 * Session information
 */
export interface SessionInfo {
  user: UserWithRoles | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Password validation requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password requirements
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | 'invalid_credentials'
  | 'user_not_found'
  | 'email_not_verified'
  | 'no_admin_role'
  | 'session_expired'
  | 'network_error'
  | 'unknown_error';

/**
 * Auth error
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: string;
}
