/**
 * API Route: Newsletter Subscribe
 * POST /api/newsletter/subscribe
 * Creates pending subscription and sends confirmation email
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscribeToNewsletter } from '@/lib/supabase/newsletterService';
import { sendNewsletterConfirmation } from '@/lib/email/newsletterEmails';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get IP and user agent for GDPR compliance
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Subscribe to newsletter
    const result = await subscribeToNewsletter(
      email,
      source || 'website',
      ipAddress,
      userAgent
    );

    if (!result.success) {
      const message = getErrorMessage(result.error);
      return NextResponse.json(
        { error: result.error, message },
        { status: 400 }
      );
    }

    // Send confirmation email
    const emailSent = await sendNewsletterConfirmation(
      email,
      result.confirmationToken!
    );

    if (!emailSent) {
      console.error('Failed to send confirmation email');
      // Don't fail the request, subscription is still created
    }

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm your subscription',
    });
  } catch (error) {
    console.error('Error in newsletter subscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'already_subscribed':
      return 'You are already subscribed to our newsletter';
    case 'already_pending':
      return 'A confirmation email has already been sent. Please check your inbox.';
    case 'database_error':
      return 'Failed to process subscription. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}
