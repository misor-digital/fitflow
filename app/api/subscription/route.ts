import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import {
  getSubscriptionsByUser,
  getUpcomingCycle,
  getUpcomingCycles,
  getDeliveryCycles,
  getAddressById,
  calculatePrice,
  createSubscription,
  createAddress,
  validatePromoCode,
  incrementPromoCodeUsage,
  enrichSubscriptionsWithLastCycle,
} from '@/lib/data';
import { validatePreferenceUpdate, findNextCycleForSubscription } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { trackSubscribeCapi, buildCapiUserData, generateEventId } from '@/lib/analytics';
import { determineFirstCycle } from '@/lib/delivery/assignment';
import { generateSingleOrderForSubscription } from '@/lib/delivery/generate';
import { sendSubscriptionCreatedEmail } from '@/lib/subscription/notifications';
import { syncSubscriptionChange } from '@/lib/email/contact-sync';
import {
  generateSubscriptionConversionEmail,
  SUBSCRIPTION_CONVERSION_SUBJECT,
} from '@/lib/email/order-subscription-conversion-email';
import { resolveEmailLabels, FREQUENCY_LABELS } from '@/lib/email/labels';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import { eurToBgn } from '@/lib/data';
import {
  getOrderByConversionToken,
  markOrderConvertedToSubscription,
  findOrCreateCustomerAccount,
} from '@/lib/data/order-subscription-conversion';
import { mapOrderBoxToSubscriptionBox } from '@/lib/subscription/order-conversion';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SubscriptionInsert } from '@/lib/supabase/types';
import type { SubscriptionWithDelivery } from '@/lib/subscription';

// ============================================================================
// Valid subscription box types & frequencies
// ============================================================================

const VALID_SUB_BOX_TYPES = new Set(['monthly-standard', 'monthly-premium']);
const VALID_FREQUENCIES = new Set(['monthly', 'seasonal']);

// ============================================================================
// GET /api/subscription - List user's subscriptions
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Auth check
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }

    // 2. Load subscriptions
    const subscriptions = await getSubscriptionsByUser(session.userId);

    // 3. Load upcoming cycles and all cycles for per-subscription matching
    const [upcomingCycles, allCycles] = await Promise.all([
      getUpcomingCycles(),
      getDeliveryCycles(),
    ]);

    // Sort all cycles ascending by date for shouldIncludeInCycle
    const allCyclesSorted = [...allCycles].sort(
      (a, b) => a.delivery_date.localeCompare(b.delivery_date),
    );

    // 4. Enrich with next delivery info (per-subscription cycle matching)
    const healedSubscriptions = await enrichSubscriptionsWithLastCycle(subscriptions);
    const enriched: SubscriptionWithDelivery[] = healedSubscriptions.map((sub) => {
      const nextCycle = findNextCycleForSubscription(sub, upcomingCycles, allCyclesSorted);
      return {
        ...sub,
        nextDeliveryDate: nextCycle?.delivery_date ?? null,
        nextCycleId: nextCycle?.id ?? null,
      };
    });

    return NextResponse.json({ subscriptions: enriched });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на абонаментите.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/subscription - Create a new subscription
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Step 1: Parse body (before auth - need conversionToken early)
    // ------------------------------------------------------------------
    let data: Record<string, unknown>;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const {
      boxType,
      frequency,
      wantsPersonalization,
      preferences,
      sizes,
      addressId,
      promoCode,
      conversionToken,
      onBehalfOfUserId,
      campaignPromoCode,
    } = data as {
      boxType?: string;
      frequency?: string;
      wantsPersonalization?: boolean;
      preferences?: {
        sports?: string[];
        sportOther?: string;
        colors?: string[];
        flavors?: string[];
        flavorOther?: string;
        dietary?: string[];
        dietaryOther?: string;
        additionalNotes?: string;
      };
      sizes?: { upper?: string; lower?: string };
      addressId?: string;
      promoCode?: string | null;
      conversionToken?: string | null;
      onBehalfOfUserId?: string | null;
      campaignPromoCode?: string | null;
      address?: {
        fullName?: string;
        phone?: string;
        city?: string;
        postalCode?: string;
        streetAddress?: string;
        buildingEntrance?: string;
        floor?: string;
        apartment?: string;
        deliveryNotes?: string;
      };
      deliveryMethod?: string;
      speedyOfficeId?: string;
      speedyOfficeName?: string;
      speedyOfficeAddress?: string;
      fullName?: string;
      phone?: string;
    };

    // ------------------------------------------------------------------
    // Step 2: Conversion Token Handling (BEFORE auth check)
    // ------------------------------------------------------------------
    let sourceOrder: Awaited<ReturnType<typeof getOrderByConversionToken>> | null = null;

    if (conversionToken) {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(conversionToken)) {
        return NextResponse.json(
          { error: 'Невалиден линк за конвертиране.' },
          { status: 400 },
        );
      }

      sourceOrder = await getOrderByConversionToken(conversionToken);
      if (!sourceOrder) {
        return NextResponse.json(
          { error: 'Невалиден или изтекъл линк за конвертиране.' },
          { status: 400 },
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 3: Auth check (modified to allow guest conversion)
    // ------------------------------------------------------------------
    const session = await verifySession();
    let userId: string | null = null;

    if (session) {
      userId = session.userId;
    } else if (sourceOrder) {
      // Guest with valid conversion token - account created below
      userId = null;
    } else {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3b: On-Behalf-Of Check (admin placing subscription for customer)
    // ------------------------------------------------------------------
    if (onBehalfOfUserId) {
      if (
        !session ||
        session.profile.user_type !== 'staff' ||
        !session.profile.staff_role ||
        !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
      ) {
        return NextResponse.json(
          { error: 'Нямате право да създавате абонаменти от името на друг потребител.' },
          { status: 403 },
        );
      }

      const { data: targetUser, error: targetError } =
        await supabaseAdmin.auth.admin.getUserById(onBehalfOfUserId);
      if (targetError || !targetUser?.user) {
        return NextResponse.json(
          { error: 'Клиентският акаунт не беше намерен.' },
          { status: 404 },
        );
      }

      console.log('[AdminAudit] On-behalf subscription', {
        action: 'on_behalf_subscription',
        adminId: session.userId,
        customerId: onBehalfOfUserId,
        customerEmail: targetUser.user.email,
        timestamp: new Date().toISOString(),
      });

      userId = onBehalfOfUserId;
    }

    // ------------------------------------------------------------------
    // Step 3c: Guest Auto-Account Creation (conversion flow)
    // ------------------------------------------------------------------
    let accountLoginUrl: string | null = null;
    let isNewAccount = false;

    if (!userId && sourceOrder) {
      const accountResult = await findOrCreateCustomerAccount(
        sourceOrder.customer_email,
        sourceOrder.customer_full_name,
      );
      userId = accountResult.userId;
      accountLoginUrl = accountResult.loginUrl;
      isNewAccount = accountResult.isNew;
    }

    // At this point, userId MUST be set
    if (!userId) {
      return NextResponse.json(
        { error: 'Не може да се определи потребителският акаунт.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Step 4: Rate limit (5/hour regular, 50/hour staff, keyed by user or token)
    // ------------------------------------------------------------------
    const isStaff = session?.profile?.user_type === 'staff' && !!session.profile.staff_role;
    const rateLimitKey = session
      ? `subscription_create:${userId}`
      : `subscription_create:token:${conversionToken}`;
    const withinLimit = await checkRateLimit(rateLimitKey, isStaff ? 50 : 5, 3600);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Step 5: Validate inputs
    // ------------------------------------------------------------------
    // Determine effective box type (server-authoritative from source order)
    let effectiveBoxType = boxType;
    if (sourceOrder) {
      effectiveBoxType = mapOrderBoxToSubscriptionBox(sourceOrder.box_type);
    }

    if (
      !effectiveBoxType ||
      typeof effectiveBoxType !== 'string' ||
      !VALID_SUB_BOX_TYPES.has(effectiveBoxType)
    ) {
      return NextResponse.json(
        { error: 'Невалиден тип кутия за абонамент.' },
        { status: 400 },
      );
    }

    // Validate frequency
    if (!frequency || typeof frequency !== 'string' || !VALID_FREQUENCIES.has(frequency)) {
      return NextResponse.json(
        { error: 'Невалидна честота на доставка.' },
        { status: 400 },
      );
    }

    // Validate addressId - must be provided and owned by resolved user
    // For conversion flow, create address from inline data if no addressId
    let resolvedAddressId = addressId;

    if (!resolvedAddressId && sourceOrder && userId) {
      const {
        address: inlineAddress,
        deliveryMethod: dm,
        speedyOfficeId: soId,
        speedyOfficeName: soName,
        speedyOfficeAddress: soAddr,
        fullName: bodyFullName,
        phone: bodyPhone,
      } = data as Record<string, unknown>;
      const addr = inlineAddress as Record<string, string> | undefined;

      if (dm === 'speedy_office' && soId) {
        const created = await createAddress({
          user_id: userId,
          full_name: (addr?.fullName || bodyFullName as string || sourceOrder.customer_full_name).trim(),
          phone: (addr?.phone || bodyPhone as string || sourceOrder.customer_phone || '').trim() || null,
          city: '',
          postal_code: '',
          street_address: '',
          delivery_method: 'speedy_office',
          speedy_office_id: soId as string,
          speedy_office_name: (soName as string) || null,
          speedy_office_address: (soAddr as string) || null,
          is_default: true,
        });
        resolvedAddressId = created.id;
      } else if (addr?.city && addr?.streetAddress) {
        const created = await createAddress({
          user_id: userId,
          full_name: (addr.fullName || bodyFullName as string || sourceOrder.customer_full_name).trim(),
          phone: (addr.phone || bodyPhone as string || sourceOrder.customer_phone || '').trim() || null,
          city: addr.city.trim(),
          postal_code: (addr.postalCode || '').trim(),
          street_address: addr.streetAddress.trim(),
          building_entrance: (addr.buildingEntrance || '').trim() || null,
          floor: (addr.floor || '').trim() || null,
          apartment: (addr.apartment || '').trim() || null,
          delivery_notes: (addr.deliveryNotes || '').trim() || null,
          delivery_method: 'address',
          is_default: true,
        });
        resolvedAddressId = created.id;
      }
    }

    if (!resolvedAddressId || typeof resolvedAddressId !== 'string') {
      return NextResponse.json(
        { error: 'Адресът е задължителен.' },
        { status: 400 },
      );
    }

    const savedAddress = await getAddressById(resolvedAddressId, userId);
    if (!savedAddress) {
      return NextResponse.json(
        { error: 'Избраният адрес не е намерен.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Step 5b: Override personalization from source order (conversion)
    // ------------------------------------------------------------------
    let effectiveWantsPersonalization = wantsPersonalization ?? false;
    let effectiveSports = preferences?.sports ?? null;
    let effectiveColors = preferences?.colors ?? null;
    let effectiveFlavors = preferences?.flavors ?? null;
    let effectiveDietary = preferences?.dietary ?? null;
    let effectiveSizeUpper = sizes?.upper ?? null;
    let effectiveSizeLower = sizes?.lower ?? null;

    if (sourceOrder) {
      effectiveWantsPersonalization = wantsPersonalization ?? sourceOrder.wants_personalization;
      effectiveSports = preferences?.sports ?? sourceOrder.sports;
      effectiveColors = preferences?.colors ?? sourceOrder.colors;
      effectiveFlavors = preferences?.flavors ?? sourceOrder.flavors;
      effectiveDietary = preferences?.dietary ?? sourceOrder.dietary;
      effectiveSizeUpper = sizes?.upper ?? sourceOrder.size_upper;
      effectiveSizeLower = sizes?.lower ?? sourceOrder.size_lower;
    }

    // ------------------------------------------------------------------
    // Step 6: Validate personalization (if wanted)
    // ------------------------------------------------------------------
    if (effectiveWantsPersonalization) {
      const prefsForValidation = {
        wants_personalization: true,
        sports: effectiveSports,
        sport_other: preferences?.sportOther ?? sourceOrder?.sport_other ?? null,
        colors: effectiveColors,
        flavors: effectiveFlavors,
        flavor_other: preferences?.flavorOther ?? sourceOrder?.flavor_other ?? null,
        dietary: effectiveDietary,
        dietary_other: preferences?.dietaryOther ?? sourceOrder?.dietary_other ?? null,
        size_upper: effectiveSizeUpper,
        size_lower: effectiveSizeLower,
        additional_notes: preferences?.additionalNotes ?? sourceOrder?.additional_notes ?? null,
      };

      const validation = validatePreferenceUpdate(prefsForValidation, effectiveBoxType);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors[0], errors: validation.errors },
          { status: 400 },
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 7: Server-side price calculation (with per-user promo validation)
    // ------------------------------------------------------------------
    const effectivePromoInput = promoCode || campaignPromoCode || null;
    let validatedPromoCode: string | undefined;
    if (effectivePromoInput) {
      const promoValid = await validatePromoCode(effectivePromoInput, userId);
      if (promoValid) {
        validatedPromoCode = effectivePromoInput;
      }
    }

    const priceInfo = await calculatePrice(effectiveBoxType, validatedPromoCode);

    // ------------------------------------------------------------------
    // Step 8: Determine first cycle (with mid-cycle support)
    // ------------------------------------------------------------------
    let cycleId: string | null = null;
    let needsImmediateOrder = false;

    try {
      const cycleResult = await determineFirstCycle();
      cycleId = cycleResult.cycleId;
      needsImmediateOrder = cycleResult.needsImmediateOrder;
    } catch {
      // No available cycle - subscription picked up when next cycle is created
      const upcomingCycle = await getUpcomingCycle();
      cycleId = upcomingCycle?.id ?? null;
    }

    // ------------------------------------------------------------------
    // Step 9: Create subscription
    // ------------------------------------------------------------------
    const subscriptionData: SubscriptionInsert = {
      user_id: userId,
      box_type: effectiveBoxType,
      frequency,
      wants_personalization: effectiveWantsPersonalization,
      sports: effectiveSports,
      sport_other: preferences?.sportOther ?? sourceOrder?.sport_other ?? null,
      colors: effectiveColors,
      flavors: effectiveFlavors,
      flavor_other: preferences?.flavorOther ?? sourceOrder?.flavor_other ?? null,
      dietary: effectiveDietary,
      dietary_other: preferences?.dietaryOther ?? sourceOrder?.dietary_other ?? null,
      size_upper: effectiveSizeUpper,
      size_lower: effectiveSizeLower,
      additional_notes: preferences?.additionalNotes ?? sourceOrder?.additional_notes ?? null,
      promo_code: priceInfo.promoCode ?? null,
      discount_percent: priceInfo.discountPercent ?? null,
      base_price_eur: priceInfo.originalPriceEur ?? priceInfo.finalPriceEur,
      current_price_eur: priceInfo.finalPriceEur,
      default_address_id: resolvedAddressId,
      first_cycle_id: cycleId,
    };

    const subscription = await createSubscription(
      subscriptionData,
      userId,
      sourceOrder ? { convertedFromOrderId: sourceOrder.id } : undefined,
    );

    // 9a. Increment promo code usage (with per-user tracking)
    if (priceInfo.promoCode) {
      try {
        await incrementPromoCodeUsage(priceInfo.promoCode, userId);
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
      }
    }

    // 9a-bis. Server-side Meta CAPI event tracking (Subscribe custom event)
    let subscribeCapiEventId: string | undefined;
    try {
      const headersList = await headers();
      const customerEmail = sourceOrder?.customer_email ?? session?.email ?? '';
      const customerFullName = sourceOrder?.customer_full_name ?? '';

      const { userData, referer } = await buildCapiUserData({
        headersObj: headersList,
        email: customerEmail || undefined,
        fullName: customerFullName || undefined,
        fbc: (data as Record<string, unknown>).fbc as string | undefined,
        fbp: (data as Record<string, unknown>).fbp as string | undefined,
      });

      subscribeCapiEventId = generateEventId();
      const capiResult = await trackSubscribeCapi({
        eventId: subscribeCapiEventId,
        sourceUrl:
          referer ||
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg'}/subscription`,
        userData,
        customData: {
          currency: 'EUR',
          value: priceInfo.finalPriceEur,
          content_name: effectiveBoxType,
          content_category: 'subscription',
          content_type: 'product',
        },
      });

      if (!capiResult.success) {
        console.warn('Meta CAPI Subscribe event failed:', capiResult.error);
      }
    } catch (capiError) {
      console.error('Error sending Meta CAPI Subscribe event:', capiError);
    }

    // ------------------------------------------------------------------
    // Step 9b: If subscribing into a cycle that's already processing,
    //          generate their order now (late addition)
    // ------------------------------------------------------------------
    if (needsImmediateOrder && cycleId) {
      try {
        await generateSingleOrderForSubscription(subscription.id, cycleId, 'system');
      } catch (err) {
        console.error('Late-addition order generation failed:', err);
        // Non-fatal - subscription was created, order can be manually added
      }
    }

    // ------------------------------------------------------------------
    // Step 10: Post-creation - mark order converted + send emails
    // ------------------------------------------------------------------
    if (sourceOrder) {
      // Mark the source order as converted
      await markOrderConvertedToSubscription(sourceOrder.id, subscription.id);

      // Send conversion-specific email with setup-password link (fire-and-forget)
      const upcomingForEmail = await getUpcomingCycle();
      const nextDate = upcomingForEmail?.delivery_date ?? '';
      const customerEmail = sourceOrder.customer_email;

      (async () => {
        try {
          const labels = await resolveEmailLabels();
          const boxName = labels.boxTypes[effectiveBoxType] ?? effectiveBoxType;
          const frequencyLabel = FREQUENCY_LABELS[frequency] ?? frequency;
          const basePriceBgn = await eurToBgn(subscription.base_price_eur);
          const currentPriceBgn = await eurToBgn(subscription.current_price_eur);

          const html = generateSubscriptionConversionEmail({
            fullName: sourceOrder.customer_full_name,
            email: customerEmail,
            boxType: effectiveBoxType,
            boxName,
            frequency,
            frequencyLabel,
            basePriceEur: subscription.base_price_eur,
            currentPriceEur: subscription.current_price_eur,
            basePriceBgn,
            currentPriceBgn,
            promoCode: subscription.promo_code,
            discountPercent: subscription.discount_percent,
            nextDeliveryDate: nextDate,
            orderNumber: sourceOrder.order_number,
            isNewAccount,
            loginUrl: accountLoginUrl,
          });

          await sendTransactionalEmail({
            to: { email: customerEmail, name: sourceOrder.customer_full_name },
            subject: SUBSCRIPTION_CONVERSION_SUBJECT,
            htmlContent: html,
            tags: ['subscription', 'conversion'],
            category: 'sub-conversion',
            relatedEntityType: 'subscription',
            relatedEntityId: subscription.id,
          });
        } catch (err) {
          console.error('[EMAIL] subscription-conversion failed:', err);
        }
      })();

      // Brevo sync - subscription activation
      syncSubscriptionChange({
        email: customerEmail,
        status: 'active',
        boxType: effectiveBoxType,
        frequency,
      }).catch(console.error);
    } else {
      // Regular flow - send confirmation email
      const upcomingForEmail = await getUpcomingCycle();
      const nextDate = upcomingForEmail?.delivery_date ?? '';
      const emailAddr = session?.email ?? '';

      if (emailAddr) {
        sendSubscriptionCreatedEmail(emailAddr, subscription, nextDate).catch(() => {});

        // Sync subscription to Brevo contacts (fire-and-forget)
        syncSubscriptionChange({
          email: emailAddr,
          status: 'active',
          boxType: effectiveBoxType,
          frequency,
        }).catch(console.error);
      }
    }

    // ------------------------------------------------------------------
    // Step 11: Return response
    // ------------------------------------------------------------------
    const responsePayload: Record<string, unknown> = {
      success: true,
      subscription,
      capiEventId: subscribeCapiEventId ?? null,
    };

    if (accountLoginUrl) {
      responsePayload.accountLoginUrl = accountLoginUrl;
    }
    if (isNewAccount) {
      responsePayload.isNewAccount = isNewAccount;
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Възникна грешка при създаване на абонамент.' },
      { status: 500 },
    );
  }
}
