/**
 * API Route: Promo Codes Management
 * GET /api/staff/promo-codes - List all promo codes
 * POST /api/staff/promo-codes - Create new promo code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { listPromoCodes, createPromoCode } from '@/lib/supabase/promoService';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await hasAnyRole(user.id, ['super_admin', 'admin_ops', 'finance', 'marketing_manager']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // List promo codes
    const result = await listPromoCodes();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      promoCodes: result.data,
    });
  } catch (error) {
    console.error('Error listing promo codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await hasAnyRole(user.id, ['super_admin', 'admin_ops', 'finance', 'marketing_manager']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { code, discountType, discountValue, validFrom, validUntil, usageLimit } = body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Code, discount type, and discount value are required' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return NextResponse.json(
        { error: 'Discount type must be "percentage" or "fixed"' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return NextResponse.json(
        { error: 'Fixed discount must be positive' },
        { status: 400 }
      );
    }

    // Create promo code
    const result = await createPromoCode(
      {
        code: code.trim(),
        discountType,
        discountValue,
        validFrom,
        validUntil,
        usageLimit,
      },
      user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code created successfully',
      promoCode: result.data,
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
