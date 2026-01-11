/**
 * Login API Route
 * 
 * Handles user authentication via Supabase Auth.
 * Frontend calls this API, API calls Supabase.
 */

import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import { logUserAction } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/audit/types';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Return specific error messages
      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { 
            error: 'Please verify your email address before logging in.',
            type: 'email_not_verified',
            email 
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { 
            error: 'Invalid email or password. Please try again.',
            type: 'invalid_credentials'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          error: error.message || 'Failed to sign in. Please try again.',
          type: 'unknown_error'
        },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to sign in. Please try again.' },
        { status: 401 }
      );
    }

    // Log successful login
    await logUserAction(data.user.id, AUDIT_ACTIONS.USER_LOGIN, {
      email: data.user.email,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
