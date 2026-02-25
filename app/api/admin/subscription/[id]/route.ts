import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  expireSubscription,
} from '@/lib/data';
import { canPause, canResume, canCancel, validateCancellationReason } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendSubscriptionPausedEmail,
  sendSubscriptionResumedEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/subscription/notifications';
import { syncSubscriptionChange } from '@/lib/email/contact-sync';

// ============================================================================
// PATCH /api/admin/subscription/:id — Admin subscription management
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Step 1: Admin auth
    // ------------------------------------------------------------------
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    // ------------------------------------------------------------------
    // Step 2: Rate limit per IP
    // ------------------------------------------------------------------
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_subscription:${ip}`, 30, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Parse body
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
    // Step 4: Load subscription (no ownership check — admin)
    // ------------------------------------------------------------------
    const sub = await getSubscriptionById(id);
    if (!sub) {
      return NextResponse.json(
        { error: 'Абонаментът не е намерен.' },
        { status: 404 },
      );
    }

    const performedBy = session.userId;

    // Resolve customer email (needed for lifecycle notifications)
    let customerEmail: string | null = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      customerEmail = authUser?.user?.email ?? null;
    } catch {
      // Non-fatal — emails will be skipped if we can't resolve
    }

    // ------------------------------------------------------------------
    // Step 5: Dispatch by action
    // ------------------------------------------------------------------
    switch (action) {
      case 'pause': {
        if (!canPause(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде спрян в текущото състояние.' },
            { status: 400 },
          );
        }
        await pauseSubscription(id, performedBy);

        // Fire-and-forget customer notification
        if (customerEmail) {
          sendSubscriptionPausedEmail(customerEmail, sub)
            .catch((err) => console.error('Admin sub pause email failed:', err));
          syncSubscriptionChange({
            email: customerEmail,
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

      case 'resume': {
        if (!canResume(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде подновен в текущото състояние.' },
            { status: 400 },
          );
        }
        await resumeSubscription(id, performedBy);

        // Fire-and-forget customer notification
        if (customerEmail) {
          import('@/lib/data').then(({ getUpcomingCycle }) =>
            getUpcomingCycle().then((upcoming) =>
              sendSubscriptionResumedEmail(
                customerEmail!,
                sub,
                upcoming?.delivery_date ?? '',
              )
            )
          ).catch((err) => console.error('Admin sub resume email failed:', err));
          syncSubscriptionChange({
            email: customerEmail,
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

        if (!canCancel(sub)) {
          return NextResponse.json(
            { error: 'Абонаментът не може да бъде отказан в текущото състояние.' },
            { status: 400 },
          );
        }

        await cancelSubscription(id, performedBy, reason);

        // Fire-and-forget customer notification
        if (customerEmail) {
          sendSubscriptionCancelledEmail(customerEmail, sub)
            .catch((err) => console.error('Admin sub cancel email failed:', err));
          syncSubscriptionChange({
            email: customerEmail,
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

      case 'expire': {
        if (sub.status === 'expired') {
          return NextResponse.json(
            { error: 'Абонаментът вече е изтекъл.' },
            { status: 400 },
          );
        }
        await expireSubscription(id, performedBy);

        // Sync expired status to Brevo (fire-and-forget)
        if (customerEmail) {
          syncSubscriptionChange({
            email: customerEmail,
            status: 'expired',
            boxType: sub.box_type,
            frequency: sub.frequency,
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          message: 'Абонаментът е маркиран като изтекъл.',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Невалидно действие.' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error processing admin subscription action:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
