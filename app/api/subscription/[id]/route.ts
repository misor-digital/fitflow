import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getSubscriptionById,
  getSubscriptionHistory,
  getOrdersByUser,
  getAddressById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  updateSubscriptionPreferences,
  updateSubscriptionAddress,
  updateSubscriptionFrequency,
} from '@/lib/data';
import {
  canPause,
  canResume,
  canCancel,
  validatePreferenceUpdate,
  validateFrequencyChange,
  validateCancellationReason,
} from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import {
  sendSubscriptionPausedEmail,
  sendSubscriptionResumedEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/subscription/notifications';
import { syncSubscriptionChange } from '@/lib/email/contact-sync';
import type { SubscriptionPreferencesUpdate } from '@/lib/subscription';

// ============================================================================
// GET /api/subscription/:id — Subscription detail
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Auth check
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }

    // 2. Load subscription with ownership check
    const { id } = await params;
    const subscription = await getSubscriptionById(id, session.userId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Абонаментът не е намерен.' },
        { status: 404 },
      );
    }

    // 3. Load history
    const history = await getSubscriptionHistory(id);

    // 4. Load linked orders for this user (filter by subscription_id client-side)
    const allOrders = await getOrdersByUser(session.userId);
    const linkedOrders = allOrders.filter(
      (order) => order.subscription_id === id,
    );

    return NextResponse.json({
      subscription,
      history,
      linkedOrders,
    });
  } catch (error) {
    console.error('Error fetching subscription detail:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на абонамента.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/subscription/:id — Subscription lifecycle & updates
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Auth check
    // ------------------------------------------------------------------
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }

    // ------------------------------------------------------------------
    // Rate limit (20 per minute per user)
    // ------------------------------------------------------------------
    const withinLimit = await checkRateLimit(
      `subscription_action:${session.userId}`,
      20,
      60,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Parse body
    // ------------------------------------------------------------------
    const { id } = await params;
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
    if (!action) {
      return NextResponse.json(
        { error: 'Липсва действие (action).' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Dispatch by action
    // ------------------------------------------------------------------

    switch (action) {
      // ================================================================
      // PAUSE
      // ================================================================
      case 'pause': {
        const sub = await getSubscriptionById(id, session.userId);
        if (!sub) {
          return NextResponse.json(
            { error: 'Абонаментът не е намерен.' },
            { status: 404 },
          );
        }
        if (!canPause(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде спрян в текущото състояние.' },
            { status: 400 },
          );
        }

        await pauseSubscription(id, session.userId);

        // Fire-and-forget email
        if (session.email) {
          sendSubscriptionPausedEmail(session.email, sub).catch(() => {});
          syncSubscriptionChange({
            email: session.email,
            status: 'paused',
            boxType: sub.box_type,
            frequency: sub.frequency,
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          message: 'Абонаментът е спрян.',
        });
      }

      // ================================================================
      // RESUME
      // ================================================================
      case 'resume': {
        const sub = await getSubscriptionById(id, session.userId);
        if (!sub) {
          return NextResponse.json(
            { error: 'Абонаментът не е намерен.' },
            { status: 404 },
          );
        }
        if (!canResume(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде подновен в текущото състояние.' },
            { status: 400 },
          );
        }

        // Note: Resuming a subscription does NOT retroactively generate orders
        // for cycles that have already been processed. The subscriber will be
        // included starting from the next eligible cycle.
        await resumeSubscription(id, session.userId);

        // Fire-and-forget email
        if (session.email) {
          const { getUpcomingCycle } = await import('@/lib/data');
          const upcoming = await getUpcomingCycle();
          sendSubscriptionResumedEmail(
            session.email,
            sub,
            upcoming?.delivery_date ?? '',
          ).catch(() => {});
          syncSubscriptionChange({
            email: session.email,
            status: 'active',
            boxType: sub.box_type,
            frequency: sub.frequency,
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          message: 'Абонаментът е подновен.',
        });
      }

      // ================================================================
      // CANCEL
      // ================================================================
      case 'cancel': {
        const reason = body.reason as string | undefined;
        if (!reason || typeof reason !== 'string') {
          return NextResponse.json(
            { error: 'Причината за отказ е задължителна.' },
            { status: 400 },
          );
        }

        const reasonValid = validateCancellationReason(reason);
        if (!reasonValid) {
          return NextResponse.json(
            { error: 'Причината трябва да е между 1 и 1000 символа.' },
            { status: 400 },
          );
        }

        const sub = await getSubscriptionById(id, session.userId);
        if (!sub) {
          return NextResponse.json(
            { error: 'Абонаментът не е намерен.' },
            { status: 404 },
          );
        }
        if (!canCancel(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде отказан в текущото състояние.' },
            { status: 400 },
          );
        }

        await cancelSubscription(id, session.userId, reason);

        // Fire-and-forget email
        if (session.email) {
          sendSubscriptionCancelledEmail(session.email, sub).catch(() => {});
          syncSubscriptionChange({
            email: session.email,
            status: 'cancelled',
            boxType: sub.box_type,
            frequency: sub.frequency,
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          message: 'Абонаментът е отказан.',
        });
      }

      // ================================================================
      // UPDATE PREFERENCES
      // ================================================================
      case 'update_preferences': {
        const prefs = body.preferences as Record<string, unknown> | undefined;
        if (!prefs || typeof prefs !== 'object') {
          return NextResponse.json(
            { error: 'Липсват данни за предпочитания.' },
            { status: 400 },
          );
        }

        const sub = await getSubscriptionById(id, session.userId);
        if (!sub) {
          return NextResponse.json(
            { error: 'Абонаментът не е намерен.' },
            { status: 404 },
          );
        }

        if (sub.status !== 'active' && sub.status !== 'paused') {
          return NextResponse.json(
            { error: 'Предпочитанията могат да се обновяват само на активни или спрени абонаменти.' },
            { status: 400 },
          );
        }

        const prefsUpdate: SubscriptionPreferencesUpdate = {
          wants_personalization: prefs.wants_personalization === true,
          sports: Array.isArray(prefs.sports) ? prefs.sports : null,
          sport_other: typeof prefs.sport_other === 'string' ? prefs.sport_other : null,
          colors: Array.isArray(prefs.colors) ? prefs.colors : null,
          flavors: Array.isArray(prefs.flavors) ? prefs.flavors : null,
          flavor_other: typeof prefs.flavor_other === 'string' ? prefs.flavor_other : null,
          dietary: Array.isArray(prefs.dietary) ? prefs.dietary : null,
          dietary_other: typeof prefs.dietary_other === 'string' ? prefs.dietary_other : null,
          size_upper: typeof prefs.size_upper === 'string' ? prefs.size_upper : null,
          size_lower: typeof prefs.size_lower === 'string' ? prefs.size_lower : null,
          additional_notes: typeof prefs.additional_notes === 'string' ? prefs.additional_notes : null,
        };

        const validation = validatePreferenceUpdate(prefsUpdate, sub.box_type);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.errors[0], errors: validation.errors },
            { status: 400 },
          );
        }

        await updateSubscriptionPreferences(id, session.userId, prefsUpdate);
        return NextResponse.json({
          success: true,
          message: 'Предпочитанията са обновени.',
        });
      }

      // ================================================================
      // UPDATE ADDRESS
      // ================================================================
      case 'update_address': {
        const newAddressId = body.addressId as string | undefined;
        if (!newAddressId || typeof newAddressId !== 'string') {
          return NextResponse.json(
            { error: 'Адресът е задължителен.' },
            { status: 400 },
          );
        }

        // Verify address ownership
        const addressOwned = await getAddressById(newAddressId, session.userId);
        if (!addressOwned) {
          return NextResponse.json(
            { error: 'Избраният адрес не е намерен.' },
            { status: 400 },
          );
        }

        await updateSubscriptionAddress(id, session.userId, newAddressId);
        return NextResponse.json({
          success: true,
          message: 'Адресът е обновен.',
        });
      }

      // ================================================================
      // UPDATE FREQUENCY
      // ================================================================
      case 'update_frequency': {
        const newFrequency = body.frequency as string | undefined;
        if (!newFrequency || typeof newFrequency !== 'string') {
          return NextResponse.json(
            { error: 'Честотата е задължителна.' },
            { status: 400 },
          );
        }

        const sub = await getSubscriptionById(id, session.userId);
        if (!sub) {
          return NextResponse.json(
            { error: 'Абонаментът не е намерен.' },
            { status: 404 },
          );
        }

        const freqValidation = validateFrequencyChange(sub.frequency, newFrequency);
        if (!freqValidation.valid) {
          return NextResponse.json(
            { error: freqValidation.error },
            { status: 400 },
          );
        }

        await updateSubscriptionFrequency(id, session.userId, newFrequency as 'monthly' | 'seasonal');
        return NextResponse.json({
          success: true,
          message: 'Честотата е обновена.',
        });
      }

      // ================================================================
      // Unknown action
      // ================================================================
      default:
        return NextResponse.json(
          { error: 'Невалидно действие.' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error processing subscription action:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
