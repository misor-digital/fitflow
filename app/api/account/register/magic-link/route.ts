/**
 * API Route: Customer Magic Link Registration
 * POST /api/account/register/magic-link
 * 
 * Sends a magic link (OTP) to customer's email for passwordless registration
 */

import { NextRequest } from 'next/server';
import { requestMagicLinkSignUp, isStaffEmail } from '@/lib/supabase/customerAuthService';
import { magicLinkSignUpSchema } from '@/lib/validation/customerAuth';
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
    const validatedData = magicLinkSignUpSchema.parse(body);

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

    // Request magic link with user data
    const { error } = await requestMagicLinkSignUp(
      validatedData.email,
      validatedData.fullName,
      validatedData.phone,
      validatedData.preferredLanguage || 'bg',
      validatedData.marketingConsent || false,
      redirectTo
    );

    if (error) {
      console.error('Error requesting magic link:', error);
      // Don't reveal if email exists or not for security
    }

    // Always return success to prevent email enumeration
    return successResponse({
      message: 'Проверете имейла си за линк за регистрация.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in magic link registration:', error);
    return internalErrorResponse('Грешка при изпращане на линк');
  }
}
