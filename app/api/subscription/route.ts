import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getSubscriptionsByUser,
  getUpcomingCycle,
  getAddressById,
  calculatePrice,
  createSubscription,
} from '@/lib/data';
import { validatePreferenceUpdate } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { determineFirstCycle } from '@/lib/delivery/assignment';
import { generateSingleOrderForSubscription } from '@/lib/delivery/generate';
import { sendSubscriptionCreatedEmail } from '@/lib/subscription/notifications';
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
    // Step 1: Auth check
    // ------------------------------------------------------------------
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }

    // ------------------------------------------------------------------
    // Step 2: Rate limit (5 per hour per user)
    // ------------------------------------------------------------------
    const withinLimit = await checkRateLimit(
      `subscription_create:${session.userId}`,
      5,
      3600,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Parse and validate body
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
    };

    // Validate box type
    if (!boxType || typeof boxType !== 'string' || !VALID_SUB_BOX_TYPES.has(boxType)) {
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

    // Validate addressId — must be provided and owned by user
    if (!addressId || typeof addressId !== 'string') {
      return NextResponse.json(
        { error: 'Адресът е задължителен.' },
        { status: 400 },
      );
    }

    const savedAddress = await getAddressById(addressId, session.userId);
    if (!savedAddress) {
      return NextResponse.json(
        { error: 'Избраният адрес не е намерен.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Step 4: Validate personalization (if wanted)
    // ------------------------------------------------------------------
    if (wantsPersonalization) {
      const prefsForValidation = {
        wants_personalization: true,
        sports: preferences?.sports ?? null,
        sport_other: preferences?.sportOther ?? null,
        colors: preferences?.colors ?? null,
        flavors: preferences?.flavors ?? null,
        flavor_other: preferences?.flavorOther ?? null,
        dietary: preferences?.dietary ?? null,
        dietary_other: preferences?.dietaryOther ?? null,
        size_upper: sizes?.upper ?? null,
        size_lower: sizes?.lower ?? null,
        additional_notes: preferences?.additionalNotes ?? null,
      };

      const validation = validatePreferenceUpdate(prefsForValidation, boxType);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors[0], errors: validation.errors },
          { status: 400 },
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 5: Server-side price calculation
    // ------------------------------------------------------------------
    const priceInfo = await calculatePrice(boxType, promoCode ?? undefined);

    // ------------------------------------------------------------------
    // Step 6: Determine first cycle (with mid-cycle support)
    // ------------------------------------------------------------------
    let cycleId: string | null = null;
    let needsImmediateOrder = false;

    try {
      const cycleResult = await determineFirstCycle();
      cycleId = cycleResult.cycleId;
      needsImmediateOrder = cycleResult.needsImmediateOrder;
    } catch {
      // No available cycle — subscription will be created without a first cycle
      // and will be picked up when the next cycle is created by admin
      const upcomingCycle = await getUpcomingCycle();
      cycleId = upcomingCycle?.id ?? null;
    }

    // ------------------------------------------------------------------
    // Step 7: Create subscription
    // ------------------------------------------------------------------
    const subscriptionData: SubscriptionInsert = {
      user_id: session.userId,
      box_type: boxType,
      frequency,
      wants_personalization: wantsPersonalization ?? false,
      sports: preferences?.sports ?? null,
      sport_other: preferences?.sportOther ?? null,
      colors: preferences?.colors ?? null,
      flavors: preferences?.flavors ?? null,
      flavor_other: preferences?.flavorOther ?? null,
      dietary: preferences?.dietary ?? null,
      dietary_other: preferences?.dietaryOther ?? null,
      size_upper: sizes?.upper ?? null,
      size_lower: sizes?.lower ?? null,
      additional_notes: preferences?.additionalNotes ?? null,
      promo_code: priceInfo.promoCode ?? null,
      discount_percent: priceInfo.discountPercent ?? null,
      base_price_eur: priceInfo.originalPriceEur ?? priceInfo.finalPriceEur,
      current_price_eur: priceInfo.finalPriceEur,
      default_address_id: addressId,
      first_cycle_id: cycleId,
    };

    const subscription = await createSubscription(subscriptionData, session.userId);

    // ------------------------------------------------------------------
    // Step 7b: If subscribing into a cycle that's already processing,
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
    // Step 7c: Send confirmation email (fire-and-forget)
    // ------------------------------------------------------------------
    const upcomingForEmail = await getUpcomingCycle();
    const nextDate = upcomingForEmail?.delivery_date ?? '';
    if (session.email) {
      sendSubscriptionCreatedEmail(session.email, subscription, nextDate).catch(() => {});
    }

    // ------------------------------------------------------------------
    // Step 8: Return response
    // ------------------------------------------------------------------
    return NextResponse.json(
      { success: true, subscription },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Възникна грешка при създаване на абонамент.' },
      { status: 500 },
    );
  }
}
