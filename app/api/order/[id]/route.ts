import { type NextRequest, NextResponse } from 'next/server';
import {
  getOrderByPersonalizationToken,
  updateOrderPersonalization,
  type OrderPersonalizationUpdate,
} from '@/lib/data/order-personalization';
import { validatePreferenceUpdate, type SubscriptionPreferencesUpdate } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';

// ============================================================================
// PATCH /api/order/:id - Post-checkout personalization (token-authorized)
//
// Lets a customer finish box personalization from the thank-you page right
// after checkout. Guest-safe: authorization is by a one-time personalization
// token minted at order creation (no session required).
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // ------------------------------------------------------------------
    // Parse body
    // ------------------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const action = body.action as string | undefined;
    if (action !== 'update_preferences') {
      return NextResponse.json(
        { error: 'Невалидно действие.' },
        { status: 400 },
      );
    }

    const token = body.token as string | undefined;
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Липсва или невалиден токен.' },
        { status: 401 },
      );
    }

    // ------------------------------------------------------------------
    // Rate limit (per token)
    // ------------------------------------------------------------------
    const withinLimit = await checkRateLimit(
      `order_personalization:${token}`,
      10,
      60,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Token lookup (validates expiry + editable status)
    // ------------------------------------------------------------------
    const order = await getOrderByPersonalizationToken(token);
    if (!order || order.id !== id) {
      return NextResponse.json(
        { error: 'Връзката е невалидна или е изтекла.' },
        { status: 404 },
      );
    }

    // ------------------------------------------------------------------
    // Build + validate preferences (strict, same as subscriptions)
    // ------------------------------------------------------------------
    const prefs = body.preferences as Record<string, unknown> | undefined;
    if (!prefs || typeof prefs !== 'object') {
      return NextResponse.json(
        { error: 'Липсват данни за предпочитания.' },
        { status: 400 },
      );
    }

    const prefsUpdate: OrderPersonalizationUpdate = {
      wants_personalization: prefs.wants_personalization === true,
      sports: Array.isArray(prefs.sports) ? (prefs.sports as string[]) : null,
      sport_other: typeof prefs.sport_other === 'string' ? prefs.sport_other : null,
      colors: Array.isArray(prefs.colors) ? (prefs.colors as string[]) : null,
      flavors: Array.isArray(prefs.flavors) ? (prefs.flavors as string[]) : null,
      flavor_other: typeof prefs.flavor_other === 'string' ? prefs.flavor_other : null,
      dietary: Array.isArray(prefs.dietary) ? (prefs.dietary as string[]) : null,
      dietary_other: typeof prefs.dietary_other === 'string' ? prefs.dietary_other : null,
      size_upper: typeof prefs.size_upper === 'string' ? prefs.size_upper : null,
      size_lower: typeof prefs.size_lower === 'string' ? prefs.size_lower : null,
      additional_notes: typeof prefs.additional_notes === 'string' ? prefs.additional_notes : null,
    };

    const validation = validatePreferenceUpdate(
      prefsUpdate as SubscriptionPreferencesUpdate,
      order.box_type,
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Persist (clears the one-time token)
    // ------------------------------------------------------------------
    await updateOrderPersonalization(order.id, prefsUpdate);

    return NextResponse.json({
      success: true,
      message: 'Предпочитанията са запазени.',
    });
  } catch (error) {
    console.error('Error updating order personalization:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
