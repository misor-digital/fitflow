import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDeliveryPricing } from '@/lib/delivery/pricing';

/**
 * GET /api/admin/settings/delivery-pricing
 * Fetch all delivery pricing rows.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп.' }, { status: 403 });
    }

    const pricing = await getDeliveryPricing();
    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error fetching delivery pricing:', error);
    return NextResponse.json({ error: 'Грешка при зареждане.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settings/delivery-pricing
 * Update a single delivery method price.
 * Body: { deliveryMethod: string, priceEur: number }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const body = await request.json();
    const { deliveryMethod, priceEur } = body as { deliveryMethod?: string; priceEur?: number };

    if (!deliveryMethod || typeof deliveryMethod !== 'string') {
      return NextResponse.json({ error: 'Методът е задължителен.' }, { status: 400 });
    }

    const validMethods = ['address', 'speedy_office', 'speedy_automat'];
    if (!validMethods.includes(deliveryMethod)) {
      return NextResponse.json({ error: 'Невалиден метод на доставка.' }, { status: 400 });
    }

    if (priceEur == null || typeof priceEur !== 'number' || priceEur < 0 || priceEur > 100) {
      return NextResponse.json({ error: 'Цената трябва да е число между 0 и 100.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('delivery_pricing')
      .update({ price_eur: priceEur, updated_at: new Date().toISOString() })
      .eq('delivery_method', deliveryMethod);

    if (error) {
      console.error('Error updating delivery pricing:', error);
      return NextResponse.json({ error: 'Грешка при запазване.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating delivery pricing:', error);
    return NextResponse.json({ error: 'Грешка при обновяване.' }, { status: 500 });
  }
}
