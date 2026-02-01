/**
 * API Route: Customer Magic Link Login
 * POST /api/account/login/magic-link
 * 
 * Sends a magic link (OTP) to customer's email for passwordless login
 */

import { NextRequest } from 'next/server';
import { requestMagicLinkSignIn, isStaffEmail } from '@/lib/supabase/customerAuthService';
import { magicLinkSignInSchema } from '@/lib/validation/customerAuth';
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = magicLinkSignInSchema.parse(body);

    // Check if email belongs to staff user
    const isStaff = await isStaffEmail(validatedData.email);
    
    if (isStaff) {
      // Redirect staff users to staff login page
      return successResponse({
        message: 'Моля, използвайте служебната система за вход.',
        redirectTo: '/staff/login',
      });
    }

    // Build redirect URL
    const redirectTo = validatedData.redirect
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/account/auth/callback?redirect=${encodeURIComponent(validatedData.redirect)}`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/account/auth/callback`;

    // Request magic link
    const { error } = await requestMagicLinkSignIn(
      validatedData.email,
      redirectTo
    );

    if (error) {
      console.error('Error requesting magic link:', error);
      // Don't reveal if email exists or not for security
    }

    // Always return success to prevent email enumeration
    return successResponse({
      message: 'Ако имейлът е регистриран, ще получите линк за вход.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in magic link login:', error);
    return internalErrorResponse('Грешка при изпращане на линк');
  }
}
