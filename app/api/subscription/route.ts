import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getSubscriptionsByUser,
  getUpcomingCycle,
  getAddressById,
  calculatePrice,
  createSubscription,
  validatePromoCode,
  incrementPromoCodeUsage,
} from '@/lib/data';
import { validatePreferenceUpdate } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { determineFirstCycle } from '@/lib/delivery/assignment';
import { generateSingleOrderForSubscription } from '@/lib/delivery/generate';
import { sendSubscriptionCreatedEmail } from '@/lib/subscription/notifications';
import { syncSubscriptionChange } from '@/lib/email/contact-sync';
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
// GET /api/subscription — List user's subscriptions
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

    // 3. Load upcoming cycle for enrichment
    const upcomingCycle = await getUpcomingCycle();

    // 4. Enrich with next delivery info
    const enriched: SubscriptionWithDelivery[] = subscriptions.map((sub) => ({
      ...sub,
      nextDeliveryDate: upcomingCycle?.delivery_date ?? null,
      nextCycleId: upcomingCycle?.id ?? null,
    }));

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
// POST /api/subscription — Create a new subscription
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Step 1: Parse body (before auth — need conversionToken early)
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
      // Guest with valid conversion token — account created below
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
    let accountSetupUrl: string | null = null;
    let isNewAccount = false;

    if (!userId && sourceOrder) {
      const accountResult = await findOrCreateCustomerAccount(
        sourceOrder.customer_email,
        sourceOrder.customer_full_name,
      );
      userId = accountResult.userId;
      accountSetupUrl = accountResult.setupUrl;
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

    // Validate addressId — must be provided and owned by resolved user
    if (!addressId || typeof addressId !== 'string') {
      return NextResponse.json(
        { error: 'Адресът е задължителен.' },
        { status: 400 },
      );
    }

    const savedAddress = await getAddressById(addressId, userId);
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
        sport_other: preferences?.sportOther ?? null,
        colors: effectiveColors,
        flavors: effectiveFlavors,
        flavor_other: preferences?.flavorOther ?? null,
        dietary: effectiveDietary,
        dietary_other: preferences?.dietaryOther ?? null,
        size_upper: effectiveSizeUpper,
        size_lower: effectiveSizeLower,
        additional_notes: preferences?.additionalNotes ?? null,
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
      // No available cycle — subscription picked up when next cycle is created
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
      sport_other: preferences?.sportOther ?? null,
      colors: effectiveColors,
      flavors: effectiveFlavors,
      flavor_other: preferences?.flavorOther ?? null,
      dietary: effectiveDietary,
      dietary_other: preferences?.dietaryOther ?? null,
      size_upper: effectiveSizeUpper,
      size_lower: effectiveSizeLower,
      additional_notes: preferences?.additionalNotes ?? null,
      promo_code: priceInfo.promoCode ?? null,
      discount_percent: priceInfo.discountPercent ?? null,
      base_price_eur: priceInfo.originalPriceEur ?? priceInfo.finalPriceEur,
      current_price_eur: priceInfo.finalPriceEur,
      default_address_id: addressId,
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

    // ------------------------------------------------------------------
    // Step 9b: If subscribing into a cycle that's already processing,
    //          generate their order now (late addition)
    // ------------------------------------------------------------------
    if (needsImmediateOrder && cycleId) {
      try {
        await generateSingleOrderForSubscription(subscription.id, cycleId, 'system');
      } catch (err) {
        console.error('Late-addition order generation failed:', err);
        // Non-fatal — subscription was created, order can be manually added
      }
    }

    // ------------------------------------------------------------------
    // Step 10: Post-creation — mark order converted + send emails
    // ------------------------------------------------------------------
    if (sourceOrder) {
      // Mark the source order as converted
      await markOrderConvertedToSubscription(sourceOrder.id, subscription.id);

      // Send confirmation email (fire-and-forget)
      const upcomingForEmail = await getUpcomingCycle();
      const nextDate = upcomingForEmail?.delivery_date ?? '';
      const customerEmail = sourceOrder.customer_email;

      sendSubscriptionCreatedEmail(customerEmail, subscription, nextDate).catch(() => {});

      // Brevo sync — subscription activation
      syncSubscriptionChange({
        email: customerEmail,
        status: 'active',
        boxType: effectiveBoxType,
        frequency,
      }).catch(console.error);
    } else {
      // Regular flow — send confirmation email
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
    };

    if (accountSetupUrl) {
      responsePayload.accountSetupUrl = accountSetupUrl;
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
