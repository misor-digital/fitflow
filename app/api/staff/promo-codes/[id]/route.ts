/**
 * API Route: Single Promo Code Management
 * GET /api/staff/promo-codes/[id] - Get promo code details
 * PUT /api/staff/promo-codes/[id] - Update promo code
 * DELETE /api/staff/promo-codes/[id] - Delete promo code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { getPromoCode, updatePromoCode, deletePromoCode } from '@/lib/supabase/promoService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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

    // Get promo code
    const result = await getPromoCode(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      promoCode: result.data,
    });
  } catch (error) {
    console.error('Error getting promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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

    // Validate discount type if provided
    if (discountType && discountType !== 'percentage' && discountType !== 'fixed') {
      return NextResponse.json(
        { error: 'Discount type must be "percentage" or "fixed"' },
        { status: 400 }
      );
    }

    // Validate discount value if provided
    if (discountValue !== undefined) {
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
    }

    // Update promo code
    const result = await updatePromoCode(
      id,
      {
        code: code?.trim(),
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
      message: 'Promo code updated successfully',
      promoCode: result.data,
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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

    // Delete promo code
    const result = await deletePromoCode(id, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
