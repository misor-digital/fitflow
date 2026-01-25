/**
 * Customer Authentication Validation Schemas
 * 
 * Zod schemas for validating customer auth API requests
 */

import { z } from 'zod';

/**
 * Sign up validation schema
 */
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  preferredLanguage: z.enum(['bg', 'en']).optional(),
  marketingConsent: z.boolean().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Sign in validation schema
 */
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  preferredLanguage: z.enum(['bg', 'en']).optional(),
  marketingConsent: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Claim preorder validation schema
 */
export const claimPreorderSchema = z.object({
  preorderId: z.string().uuid('Invalid preorder ID'),
});

export type ClaimPreorderInput = z.infer<typeof claimPreorderSchema>;

/**
 * Safe redirect URL validation
 * Prevents open redirect vulnerabilities
 */
export const redirectSchema = z.object({
  redirect: z
    .string()
    .optional()
    .refine(
      (url) => {
        if (!url) return true;
        // Only allow relative URLs or URLs to the same origin
        return url.startsWith('/') && !url.startsWith('//');
      },
      { message: 'Invalid redirect URL' }
    ),
});

export type RedirectInput = z.infer<typeof redirectSchema>;
