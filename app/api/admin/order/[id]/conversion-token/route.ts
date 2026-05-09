import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_EDIT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateOrderForConversion } from '@/lib/subscription/order-conversion';
import type { OrderRow } from '@/lib/supabase/types';

// ============================================================================
// POST /api/admin/order/:id/conversion-token
// Generate (or retrieve existing) subscription conversion token for an order.
// ============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_EDIT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате права за тази операция.' }, { status: 403 });
    }

    // 2. Parse route params
    const { id: orderId } = await params;

    // 3. Fetch the order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 });
    }

    const orderRow = order as OrderRow;

    // 4. If already has a valid pending token, return it
    if (
      orderRow.subscription_conversion_status === 'pending' &&
      orderRow.subscription_conversion_token
    ) {
      // Check if not expired
      const expiresAt = orderRow.subscription_conversion_token_expires_at
        ? new Date(orderRow.subscription_conversion_token_expires_at)
        : null;

      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json({
          token: orderRow.subscription_conversion_token,
          status: 'pending',
          existing: true,
        });
      }
      // Token expired - fall through to generate a new one
    }

    // 5. If already converted, reject
    if (orderRow.subscription_conversion_status === 'converted' || orderRow.converted_to_subscription_id) {
      return NextResponse.json(
        { error: 'Поръчката вече е конвертирана в абонамент.' },
        { status: 409 },
      );
    }

    // 6. Validate eligibility
    const eligibility = validateOrderForConversion(orderRow);
    if (!eligibility.valid) {
      return NextResponse.json(
        { error: eligibility.reason ?? 'Поръчката не е подходяща за конвертиране.' },
        { status: 400 },
      );
    }

    // 7. Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        subscription_conversion_token: token,
        subscription_conversion_token_expires_at: expiresAt,
        subscription_conversion_status: 'pending',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error generating conversion token:', updateError);
      return NextResponse.json(
        { error: 'Грешка при генериране на токен.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token,
      status: 'pending',
      existing: false,
    });
  } catch (err) {
    console.error('[admin/order/conversion-token POST]', err);
    return NextResponse.json(
      { error: 'Възникна неочаквана грешка.' },
      { status: 500 },
    );
  }
}
