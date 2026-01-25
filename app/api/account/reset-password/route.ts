/**
 * API Route: Customer Reset Password
 * POST /api/account/reset-password
 * 
 * Updates the customer's password (requires valid session from reset link)
 */

import { NextRequest } from 'next/server';
import { updatePassword } from '@/lib/supabase/customerAuthService';
import { getCurrentUser } from '@/lib/supabase/server';
import { resetPasswordSchema } from '@/lib/validation/customerAuth';
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse('Сесията е изтекла. Моля, поискайте нов линк за възстановяване.');
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Update password
    const { error } = await updatePassword({
      newPassword: validatedData.password,
    });

    if (error) {
      if (error.message.includes('Same password')) {
        return errorResponse(
          'SAME_PASSWORD',
          'Новата парола трябва да е различна от старата',
          400
        );
      }

      return errorResponse(
        'PASSWORD_UPDATE_FAILED',
        'Грешка при промяна на паролата',
        400
      );
    }

    // Return success
    return successResponse({
      message: 'Паролата е променена успешно',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error in reset password:', error);
    return internalErrorResponse('Грешка при промяна на паролата');
  }
}
