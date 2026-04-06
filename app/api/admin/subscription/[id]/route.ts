import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { revalidateDataTag, TAG_SUBSCRIPTIONS } from '@/lib/data/cache-tags';
import {
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  expireSubscription,
  adminUpdateSubscriptionFrequency,
  validatePromoCode,
  calculatePrice,
} from '@/lib/data';
import { canPause, canResume, canCancel, validateCancellationReason, validateFrequencyChange } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendSubscriptionPausedEmail,
  sendSubscriptionResumedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionAddressChangedEmail,
  sendSubscriptionFrequencyChangedEmail,
  formatAddressForEmail,
} from '@/lib/subscription/notifications';
import { syncSubscriptionChange } from '@/lib/email/contact-sync';

// ============================================================================
// PATCH /api/admin/subscription/:id - Admin subscription management
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
    // Step 4: Load subscription (no ownership check - admin)
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
      // Non-fatal - emails will be skipped if we can't resolve
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

      case 'update_address': {
        const addressId = body.addressId as string | null;

        // addressId can be null (to clear the address) or a valid UUID
        if (addressId !== null) {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!UUID_REGEX.test(addressId)) {
            return NextResponse.json(
              { error: 'Невалиден формат на адрес ID.' },
              { status: 400 },
            );
          }

          // Verify the address exists and belongs to the subscription's user
          const { getAddressById } = await import('@/lib/data');
          const address = await getAddressById(addressId, sub.user_id);
          if (!address) {
            return NextResponse.json(
              { error: 'Адресът не е намерен или не принадлежи на потребителя.' },
              { status: 404 },
            );
          }
        }

        // Update the subscription
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({ default_address_id: addressId })
          .eq('id', id);

        if (updateError) {
          console.error('Failed to update subscription address:', updateError);
          return NextResponse.json(
            { error: 'Грешка при обновяване на адреса.' },
            { status: 500 },
          );
        }

        // Log to subscription_history
        await supabaseAdmin.from('subscription_history').insert({
          subscription_id: id,
          action: 'address_changed',
          details: {
            previous_address_id: sub.default_address_id,
            new_address_id: addressId,
            changed_by: 'admin',
          },
          performed_by: performedBy,
        });

        revalidateDataTag(TAG_SUBSCRIPTIONS);

        // Fire-and-forget customer notification
        if (customerEmail) {
          const { getAddressById } = await import('@/lib/data');
          const [oldAddr, newAddr] = await Promise.all([
            sub.default_address_id ? getAddressById(sub.default_address_id, sub.user_id) : null,
            addressId ? getAddressById(addressId, sub.user_id) : null,
          ]);
          sendSubscriptionAddressChangedEmail(
            customerEmail, sub,
            formatAddressForEmail(oldAddr),
            formatAddressForEmail(newAddr),
          ).catch((err) => console.error('Admin address change email failed:', err));
        }

        return NextResponse.json({
          success: true,
          message: addressId ? 'Адресът е обновен.' : 'Адресът е премахнат.',
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

      case 'update_frequency': {
        const newFrequency = body.frequency as string | undefined;
        if (!newFrequency || typeof newFrequency !== 'string') {
          return NextResponse.json(
            { error: 'Честотата е задължителна.' },
            { status: 400 },
          );
        }

        const freqValidation = validateFrequencyChange(sub.frequency, newFrequency);
        if (!freqValidation.valid) {
          return NextResponse.json(
            { error: freqValidation.error },
            { status: 400 },
          );
        }

        await adminUpdateSubscriptionFrequency(id, performedBy, newFrequency as 'monthly' | 'seasonal');

        // Fire-and-forget customer notification + Brevo sync
        if (customerEmail) {
          sendSubscriptionFrequencyChangedEmail(customerEmail, sub, sub.frequency, newFrequency)
            .catch((err) => console.error('Admin frequency change email failed:', err));
          syncSubscriptionChange({
            email: customerEmail,
            status: sub.status,
            boxType: sub.box_type,
            frequency: newFrequency,
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          message: 'Честотата е обновена.',
        });
      }

      case 'update_promo': {
        const newPromoCode = body.promoCode as string | null | undefined;
        const newMaxCycles = body.maxCycles as number | null | undefined;
        const actionType = body.type as string;

        if (actionType === 'clear') {
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              promo_code: null,
              discount_percent: null,
              current_price_eur: sub.base_price_eur,
              promo_max_cycles: null,
              promo_cycles_used: sub.promo_cycles_used ?? 0,
            })
            .eq('id', id);

          if (updateError) {
            console.error('Failed to clear subscription promo:', updateError);
            return NextResponse.json(
              { error: 'Грешка при премахване на промо кода.' },
              { status: 500 },
            );
          }

          await supabaseAdmin.from('subscription_history').insert({
            subscription_id: id,
            action: 'promo_cleared',
            details: {
              previous_promo_code: sub.promo_code,
              previous_discount_percent: sub.discount_percent,
              changed_by: 'admin',
            },
            performed_by: performedBy,
          });

          revalidateDataTag(TAG_SUBSCRIPTIONS);

          return NextResponse.json({
            success: true,
            message: 'Промо кодът е премахнат от абонамента.',
          });
        }

        if (actionType === 'update_cycles') {
          if (!sub.promo_code) {
            return NextResponse.json(
              { error: 'Абонаментът няма активен промо код.' },
              { status: 400 },
            );
          }

          if (newMaxCycles !== null && newMaxCycles !== undefined) {
            if (!Number.isInteger(newMaxCycles) || newMaxCycles < 1) {
              return NextResponse.json(
                { error: 'Максималните цикли трябва да е положително цяло число.' },
                { status: 400 },
              );
            }
          }

          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ promo_max_cycles: newMaxCycles ?? null })
            .eq('id', id);

          if (updateError) {
            console.error('Failed to update promo max cycles:', updateError);
            return NextResponse.json(
              { error: 'Грешка при обновяване на промо цикли.' },
              { status: 500 },
            );
          }

          await supabaseAdmin.from('subscription_history').insert({
            subscription_id: id,
            action: 'promo_cycles_updated',
            details: {
              previous_max_cycles: sub.promo_max_cycles,
              new_max_cycles: newMaxCycles ?? null,
              changed_by: 'admin',
            },
            performed_by: performedBy,
          });

          revalidateDataTag(TAG_SUBSCRIPTIONS);

          return NextResponse.json({
            success: true,
            message: 'Промо циклите са обновени.',
          });
        }

        if (actionType === 'apply') {
          if (!newPromoCode || typeof newPromoCode !== 'string') {
            return NextResponse.json(
              { error: 'Промо кодът е задължителен.' },
              { status: 400 },
            );
          }

          const promoRow = await validatePromoCode(newPromoCode);
          if (!promoRow) {
            return NextResponse.json(
              { error: 'Промо кодът е невалиден или изтекъл.' },
              { status: 400 },
            );
          }

          const priceInfo = await calculatePrice(sub.box_type, newPromoCode);

          const effectiveMaxCycles = newMaxCycles !== undefined
            ? (newMaxCycles ?? null)
            : (promoRow.default_max_cycles ?? null);

          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              promo_code: promoRow.code,
              discount_percent: promoRow.discount_percent,
              base_price_eur: priceInfo.originalPriceEur,
              current_price_eur: priceInfo.finalPriceEur,
              promo_max_cycles: effectiveMaxCycles,
              promo_cycles_used: 0,
            })
            .eq('id', id);

          if (updateError) {
            console.error('Failed to apply promo to subscription:', updateError);
            return NextResponse.json(
              { error: 'Грешка при прилагане на промо кода.' },
              { status: 500 },
            );
          }

          await supabaseAdmin.from('subscription_history').insert({
            subscription_id: id,
            action: 'promo_applied',
            details: {
              previous_promo_code: sub.promo_code,
              new_promo_code: promoRow.code,
              discount_percent: promoRow.discount_percent,
              max_cycles: effectiveMaxCycles,
              changed_by: 'admin',
            },
            performed_by: performedBy,
          });

          revalidateDataTag(TAG_SUBSCRIPTIONS);

          return NextResponse.json({
            success: true,
            message: 'Промо кодът е приложен към абонамента.',
          });
        }

        return NextResponse.json(
          { error: 'Невалиден тип на промо действие.' },
          { status: 400 },
        );
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
  } finally {
    // Bust subscription stats cache regardless of success/failure path
    // (the mutation may have partially succeeded before throwing)
    revalidateDataTag(TAG_SUBSCRIPTIONS);
  }
}
