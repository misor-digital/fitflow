/**
 * API Route: Customer Logout
 * POST /api/account/logout
 * 
 * Signs out the current customer and clears the session
 */

import { NextRequest } from 'next/server';
import { signOut } from '@/lib/supabase/customerAuthService';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/utils/apiResponse';

export async function POST() {
  try {
    // Sign out customer
    const { error } = await signOut();

    if (error) {
      console.error('Error signing out customer:', error);
      return internalErrorResponse('Грешка при излизане');
    }

    // Return success
    return successResponse({ message: 'Успешно излязохте от профила си' });
  } catch (error) {
    console.error('Error in customer logout:', error);
    return internalErrorResponse('Грешка при излизане');
  }
}
