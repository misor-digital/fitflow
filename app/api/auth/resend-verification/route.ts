/**
 * Resend Verification Email API Route
 * 
 * Handles resending email verification for unverified users.
 * Frontend calls this API, API calls Supabase.
 */

import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to resend verification email' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
