/**
 * API Route: Customer Preorders
 * GET /api/account/preorders - Get all customer preorders
 * POST /api/account/preorders - Claim a preorder
 * 
 * Manages customer preorder access and claiming
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import {
  getCustomerPreorders,
  getUnclaimedPreordersByEmail,
  claimPreorder,
} from '@/lib/supabase/customerService';
import { claimPreorderSchema } from '@/lib/validation/customerAuth';
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';
import { ZodError } from 'zod';

/**
 * GET /api/account/preorders
 * Returns all preorders for the authenticated customer
 */
export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return unauthorizedResponse('Моля, влезте в профила си');
    }

    // Get customer preorders
    const { data: preorders, error: preordersError } = await getCustomerPreorders(user.id);

    if (preordersError) {
      return internalErrorResponse('Грешка при зареждане на поръчките');
    }

    // Get unclaimed preorders by email
    const { data: unclaimedPreorders, error: unclaimedError } =
      await getUnclaimedPreordersByEmail(user.email);

    if (unclaimedError) {
      console.error('Error fetching unclaimed preorders:', unclaimedError);
    }

    // Return both claimed and unclaimed preorders
    return successResponse({
      preorders: preorders || [],
      unclaimedPreorders: unclaimedPreorders || [],
    });
  } catch (error) {
    console.error('Error getting customer preorders:', error);
    return internalErrorResponse('Грешка при зареждане на поръчките');
  }
}

/**
 * POST /api/account/preorders
 * Claims an unclaimed preorder for the authenticated customer
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return unauthorizedResponse('Моля, влезте в профила си');
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = claimPreorderSchema.parse(body);

    // Claim preorder
    const { success, error } = await claimPreorder(
      validatedData.preorderId,
      user.id,
      user.email
    );

    if (error || !success) {
      if (error?.message.includes('already claimed')) {
        return errorResponse(
          'ALREADY_CLAIMED',
          'Тази поръчка вече е свързана с друг акаунт',
          400
        );
      }

      if (error?.message.includes('not match')) {
        return errorResponse(
          'EMAIL_MISMATCH',
          'Имейлът на поръчката не съвпада с вашия акаунт',
          400
        );
      }

      return errorResponse(
        'CLAIM_FAILED',
        'Грешка при свързване на поръчката',
        400
      );
    }

    // Return success
    return successResponse({
      message: 'Поръчката е свързана успешно с вашия акаунт',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    console.error('Error claiming preorder:', error);
    return internalErrorResponse('Грешка при свързване на поръчката');
  }
}
