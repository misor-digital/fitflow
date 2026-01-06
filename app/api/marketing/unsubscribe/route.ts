/**
 * Marketing Unsubscribe API
 * Endpoint for handling email unsubscriptions with signed tokens
 */

import { NextResponse } from 'next/server';
import { updateRecipientSubscription } from '@/lib/marketing';
import { verifyUnsubscribeToken } from '@/lib/marketing/unsubscribeToken';

/**
 * POST /api/marketing/unsubscribe
 * Unsubscribe using a signed token (secure method)
 * 
 * Body: { token: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Require signed token for POST requests
    if (!body.token) {
      return NextResponse.json(
        { error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    // Verify the signed token
    const decoded = verifyUnsubscribeToken(body.token);
    
    if (!decoded) {
      console.warn('Invalid unsubscribe token attempted');
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 400 }
      );
    }

    // Process unsubscription
    const { error } = await updateRecipientSubscription(decoded.email, false);

    if (error) {
      console.error('Error unsubscribing:', error);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'Успешно се отписахте от бюлетина.',
    });

  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketing/unsubscribe
 * Handle unsubscribe via signed link click (redirects to confirmation page)
 * 
 * Query params: token (signed unsubscribe token)
 */
export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg';
  
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe?error=missing_token`);
    }

    // Verify the signed token
    const decoded = verifyUnsubscribeToken(token);
    
    if (!decoded) {
      console.warn('Invalid unsubscribe token in GET request');
      return NextResponse.redirect(`${baseUrl}/unsubscribe?error=invalid_token`);
    }

    // Process unsubscription
    const { error } = await updateRecipientSubscription(decoded.email, false);
    
    if (error) {
      console.error('Error unsubscribing:', error);
      // Still redirect to success - don't expose internal errors
    }

    // Redirect to confirmation page
    return NextResponse.redirect(`${baseUrl}/unsubscribe?success=true`);

  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.redirect(`${baseUrl}/unsubscribe?error=server_error`);
  }
}
