/**
 * API Route: Get Current Customer
 * GET /api/account/me
 * 
 * Returns the current authenticated customer's profile
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { getCustomerProfile } from '@/lib/supabase/customerService';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';

export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse('Моля, влезте в профила си');
    }

    // Get customer profile
    const { data: customer, error } = await getCustomerProfile(user.id);

    if (error || !customer) {
      return notFoundResponse('Профилът не е намерен');
    }

    // Return customer data (minimal DTO)
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
      profile: customer,
    });
  } catch (error) {
    console.error('Error getting current customer:', error);
    return internalErrorResponse('Грешка при зареждане на профила');
  }
}
