/**
 * API Route: Customer Login
 * POST /api/account/login
 * 
 * Authenticates a customer and creates a session
 */

import { NextRequest } from 'next/server';
import { signIn } from '@/lib/supabase/customerAuthService';
import { signInSchema } from '@/lib/validation/customerAuth';
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
    const validatedData = signInSchema.parse(body);

    // Authenticate customer
    const { data, error } = await signIn({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      // Handle specific error cases
      if (
        error.message.includes('Invalid') ||
        error.message.includes('credentials')
      ) {
        return errorResponse(
          'INVALID_CREDENTIALS',
          'Невалиден имейл или парола',
          401
        );
      }

      if (error.message.includes('not found')) {
        return errorResponse(
          'ACCOUNT_NOT_FOUND',
          'Акаунтът не е намерен',
          404
        );
      }

      return errorResponse(
        'LOGIN_FAILED',
        'Грешка при влизане. Моля, опитайте отново.',
        400
      );
    }

    // Return success (session is set in cookies automatically)
    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in customer login:', error);
    return internalErrorResponse('Грешка при влизане');
  }
}
