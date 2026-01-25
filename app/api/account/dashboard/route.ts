/**
 * API Route: Customer Dashboard Data
 * GET /api/account/dashboard
 * 
 * Returns dashboard data for the authenticated customer
 */

import { getCurrentUser } from '@/lib/supabase/server';
import { getCustomerProfile, getCustomerPreorders } from '@/lib/supabase/customerService';
import {
  successResponse,
  unauthorizedResponse,
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
    const { data: profile } = await getCustomerProfile(user.id);
    
    // Get preorders count
    const { data: preorders } = await getCustomerPreorders(user.id);
    const preordersCount = preorders?.length || 0;

    // Return dashboard data
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
      profile: profile || null,
      stats: {
        preordersCount,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return internalErrorResponse('Грешка при зареждане на данните');
  }
}
