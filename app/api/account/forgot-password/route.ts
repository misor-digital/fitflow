/**
 * API Route: Customer Forgot Password
 * POST /api/account/forgot-password
 * 
 * Sends a password reset email to the customer
 */

import { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/lib/supabase/customerAuthService';
import { forgotPasswordSchema } from '@/lib/validation/customerAuth';
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
    const validatedData = forgotPasswordSchema.parse(body);

    // Request password reset
    const { error } = await requestPasswordReset({
      email: validatedData.email,
    });

    if (error) {
      console.error('Error requesting password reset:', error);
      // Don't reveal if email exists or not for security
    }

    // Always return success to prevent email enumeration
    return successResponse({
      message:
        'Ако имейлът е регистриран, ще получите инструкции за възстановяване на паролата.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in forgot password:', error);
    return internalErrorResponse('Грешка при изпращане на имейл');
  }
}
