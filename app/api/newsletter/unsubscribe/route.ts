/**
 * API Route: Newsletter Unsubscribe
 * GET /api/newsletter/unsubscribe?token=xxx
 * Unsubscribes from newsletter via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeFromNewsletter } from '@/lib/supabase/newsletterService';
import { sendUnsubscribeConfirmation } from '@/lib/email/newsletterEmails';
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

    // Get subscription email before unsubscribing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: subscription } = await supabase
      .from('newsletter_subscriptions')
      .select('email')
      .eq('unsubscribe_token', token)
      .single();

    // Get IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Unsubscribe
    const result = await unsubscribeFromNewsletter(
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

    // Send confirmation email
    if (subscription) {
      await sendUnsubscribeConfirmation(subscription.email);
    }

    return NextResponse.json({
      success: true,
      message: 'You have been unsubscribed from our newsletter.',
    });
  } catch (error) {
    console.error('Error in newsletter unsubscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'not_found':
      return 'Invalid unsubscribe link';
    case 'already_unsubscribed':
      return 'You are already unsubscribed from our newsletter';
    case 'database_error':
      return 'Failed to unsubscribe. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}
