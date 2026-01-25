/**
 * API Route: Customer Registration
 * POST /api/account/register
 * 
 * Creates a new customer account with email/password authentication
 */

import { NextRequest } from 'next/server';
import { signUp } from '@/lib/supabase/customerAuthService';
import { signUpSchema } from '@/lib/validation/customerAuth';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = signUpSchema.parse(body);

    // Create customer account
    const { data, error } = await signUp({
      email: validatedData.email,
      password: validatedData.password,
      fullName: validatedData.fullName,
      phone: validatedData.phone || undefined,
      preferredLanguage: validatedData.preferredLanguage || 'bg',
      marketingConsent: validatedData.marketingConsent || false,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return errorResponse(
          'EMAIL_EXISTS',
          'Този имейл адрес вече е регистриран',
          400
        );
      }

      if (error.message.includes('Invalid email')) {
        return errorResponse(
          'INVALID_EMAIL',
          'Невалиден имейл адрес',
          400
        );
      }

      if (error.message.includes('Password')) {
        return errorResponse(
          'WEAK_PASSWORD',
          'Паролата трябва да е поне 8 символа',
          400
        );
      }

      return errorResponse(
        'REGISTRATION_FAILED',
        'Грешка при регистрация. Моля, опитайте отново.',
        400
      );
    }

    // Return success (session is set in cookies automatically)
    return successResponse(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        requiresEmailVerification: !data.user.email_confirmed_at,
      },
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in customer registration:', error);
    return internalErrorResponse('Грешка при регистрация');
  }
}
