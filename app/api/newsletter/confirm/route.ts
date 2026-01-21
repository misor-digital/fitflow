/**
 * API Route: Newsletter Confirm
 * GET /api/newsletter/confirm?token=xxx
 * Confirms newsletter subscription via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmNewsletterSubscription } from '@/lib/supabase/newsletterService';
import { sendNewsletterWelcome } from '@/lib/email/newsletterEmails';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Confirm subscription
    const result = await confirmNewsletterSubscription(
      token,
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

    // Get subscription details for welcome email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: subscription } = await supabase
      .from('newsletter_subscriptions')
      .select('email, unsubscribe_token')
      .eq('confirmation_token', token)
      .single();

    if (subscription) {
      // Send welcome email
      await sendNewsletterWelcome(
        subscription.email,
        subscription.unsubscribe_token
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription confirmed! Welcome to our newsletter.',
    });
  } catch (error) {
    console.error('Error in newsletter confirm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'not_found':
      return 'Invalid confirmation link';
    case 'already_confirmed':
      return 'This subscription has already been confirmed';
    case 'expired':
      return 'This confirmation link has expired. Please subscribe again.';
    case 'database_error':
      return 'Failed to confirm subscription. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}
