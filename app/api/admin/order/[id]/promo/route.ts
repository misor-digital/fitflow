import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_EDIT_ROLES, ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { applyPromoToOrder } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ============================================================================
// PATCH /api/admin/order/:id/promo — Apply, replace, or remove a promo code
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_EDIT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'You do not have permission for this operation.' }, { status: 403 });
    }

    // 2. Parse route params
    const { id: orderId } = await params;

    // 3. Parse and validate request body
    const body = await request.json();

    if (!('promoCode' in body)) {
      return NextResponse.json(
        { error: 'Missing required field: promoCode.' },
        { status: 400 },
      );
    }

    const rawPromoCode: unknown = body.promoCode;
    let promoCode: string | null;

    if (rawPromoCode === null) {
      promoCode = null;
    } else if (typeof rawPromoCode === 'string') {
      promoCode = rawPromoCode.trim();
      if (promoCode.length === 0) {
        return NextResponse.json(
          { error: 'promoCode cannot be an empty string. Pass null to remove.' },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'promoCode must be a string or null.' },
        { status: 400 },
      );
    }

    const notes = typeof body.notes === 'string' ? body.notes : undefined;

    // 4. Apply promo
    const updated = await applyPromoToOrder(orderId, promoCode, session.userId, notes);

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply promo code.';
    const is404 = message.toLowerCase().includes('not found');
    const is409 = message.toLowerCase().includes('cannot modify');
    const is400 = /invalid|disabled|expired|exhausted|already applied/i.test(message);
    const status = is404 ? 404 : is409 ? 409 : is400 ? 400 : 500;

    if (status === 500) {
      console.error('Error applying promo to order:', err);
    }

    return NextResponse.json({ error: message }, { status });
  }
}

// ============================================================================
// GET /api/admin/order/:id/promo — Get price change history
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Verify session + role
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'You do not have permission for this operation.' }, { status: 403 });
    }

    // 2. Parse route params
    const { id: orderId } = await params;

    // 3. Query price change history
    const { data, error } = await supabaseAdmin
      .from('order_price_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    console.error('Error fetching price history:', err);
    return NextResponse.json(
      { error: 'Failed to load price history.' },
      { status: 500 },
    );
  }
}
