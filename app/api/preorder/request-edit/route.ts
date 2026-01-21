/**
 * API Route: Request Preorder Edit Token
 * POST /api/preorder/request-edit
 * Generates a secure token and sends edit link via email
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateEditToken, checkTokenRequestRateLimit } from '@/lib/supabase/preorderEditService';
import { sendPreorderEditLink } from '@/lib/email/preorderEditEmails';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderId } = body;

    if (!email || !orderId) {
      return NextResponse.json(
        { error: 'Email and order ID are required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await checkTokenRequestRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          remainingRequests: rateLimit.remainingRequests 
        },
        { status: 429 }
      );
    }

    // Get preorder by order_id and email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: preorder, error: preorderError } = await supabase
      .from('preorders')
      .select('*')
      .eq('order_id', orderId)
      .eq('email', email)
      .single();

    if (preorderError || !preorder) {
      return NextResponse.json(
        { error: 'Preorder not found' },
        { status: 404 }
      );
    }

    // Generate edit token
    const tokenResult = await generateEditToken(preorder.id, 'edit');
    if (!tokenResult) {
      return NextResponse.json(
        { error: 'Failed to generate edit token' },
        { status: 500 }
      );
    }

    // Send email with edit link
    const emailSent = await sendPreorderEditLink(
      email,
      preorder.full_name,
      orderId,
      tokenResult.token,
      tokenResult.expiresAt
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Edit link sent to your email',
      expiresAt: tokenResult.expiresAt,
    });
  } catch (error) {
    console.error('Error in request-edit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
