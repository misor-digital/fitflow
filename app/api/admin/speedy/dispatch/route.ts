import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/admin/speedy/dispatch?cycleId=xxx
 *
 * Admin-only. Fetch orders for the dispatch dashboard.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const cycleId = request.nextUrl.searchParams.get('cycleId');
    if (!cycleId) {
      return NextResponse.json({ error: 'Параметърът cycleId е задължителен.' }, { status: 400 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_number, user_id, customer_first_name, customer_last_name, delivery_method, shipping_address, speedy_waybill_id, speedy_parcel_ids, speedy_status, delivery_fee_eur, delivery_fee_actual_eur',
      )
      .eq('delivery_cycle_id', cycleId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch dispatch orders:', error);
      return NextResponse.json({ error: 'Грешка при извличане на поръчки.' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders ?? [] });
  } catch (error) {
    console.error('Dispatch API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
