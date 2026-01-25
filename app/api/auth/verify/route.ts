/**
 * API Route: Verify Authentication
 * GET /api/auth/verify
 * 
 * Lightweight endpoint to check if user is authenticated
 * Used by NextJS proxy to verify session without direct Supabase calls
 */

import { getCurrentUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id || null,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error verifying auth:', error);
    return NextResponse.json({
      authenticated: false,
      userId: null,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
