/**
 * API Route: Customer Profile
 * PATCH /api/account/profile
 * 
 * Updates the current customer's profile
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { updateCustomerProfile } from '@/lib/supabase/customerService';
import { updateProfileSchema } from '@/lib/validation/customerAuth';
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse('Моля, влезте в профила си');
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update profile
    const { data: customer, error } = await updateCustomerProfile(user.id, {
      fullName: validatedData.fullName,
      phone: validatedData.phone,
      preferredLanguage: validatedData.preferredLanguage,
      marketingConsent: validatedData.marketingConsent,
    });

    if (error || !customer) {
      return errorResponse(
        'UPDATE_FAILED',
        'Грешка при актуализиране на профила',
        400
      );
    }

    // Return updated profile
    return successResponse({
      profile: customer,
      message: 'Профилът е актуализиран успешно',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error updating customer profile:', error);
    return internalErrorResponse('Грешка при актуализиране на профила');
  }
}
