/**
 * API Route: Edit Preorder with Token
 * GET /api/preorder/edit?token=xxx - Validate token and get preorder data
 * PUT /api/preorder/edit - Update preorder with token
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEditToken, updatePreorderWithToken } from '@/lib/supabase/preorderEditService';
import { sendPreorderUpdateConfirmation } from '@/lib/email/preorderEditEmails';

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

    // Validate token and get preorder
    const validation = await validateEditToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: validation.error,
          message: getErrorMessage(validation.error)
        },
        { status: 400 }
      );
    }

    // Return preorder data (without sensitive info)
    return NextResponse.json({
      success: true,
      preorder: validation.preorder,
    });
  } catch (error) {
    console.error('Error in GET edit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, updates } = body;

    if (!token || !updates) {
      return NextResponse.json(
        { error: 'Token and updates are required' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update preorder
    const result = await updatePreorderWithToken(
      token,
      updates,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          message: getErrorMessage(result.error)
        },
        { status: 400 }
      );
    }

    // Send confirmation email
    if (result.preorder) {
      await sendPreorderUpdateConfirmation(
        result.preorder.email,
        result.preorder.full_name,
        result.preorder.order_id
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preorder updated successfully',
      preorder: result.preorder,
    });
  } catch (error) {
    console.error('Error in PUT edit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'not_found':
      return 'Invalid or expired edit link';
    case 'expired':
      return 'This edit link has expired. Please request a new one.';
    case 'already_used':
      return 'This edit link has already been used. Please request a new one.';
    case 'invalid':
      return 'Invalid edit link';
    case 'update_failed':
      return 'Failed to update preorder. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}
