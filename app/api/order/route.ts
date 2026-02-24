import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import {
  createOrder,
  createAddress,
  getAddressById,
  calculatePrice,
  incrementPromoCodeUsage,
  getPreorderByToken,
  markPreorderConverted,
} from '@/lib/data';
import { validateAddress, addressInputToSnapshot } from '@/lib/order';
import { isSubscriptionBox, EMAIL_REGEX, isValidPhone } from '@/lib/preorder';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { trackLeadCapi, hashForMeta, generateEventId } from '@/lib/analytics';
import type { OrderInsert, ShippingAddressSnapshot, Preorder, BoxType } from '@/lib/supabase/types';
import type { AddressInput } from '@/lib/order';

// ============================================================================
// Input length limits
// ============================================================================

const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_PHONE = 30;
const MAX_NOTES = 2000;
const MAX_OTHER = 200;

const VALID_BOX_TYPES = new Set([
  'monthly-standard',
  'monthly-premium',
  'monthly-premium-monthly',
  'monthly-premium-seasonal',
  'onetime-standard',
  'onetime-premium',
]);

// ============================================================================
// POST /api/order
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ------------------------------------------------------------------
    // Step 1: Rate Limiting
    // ------------------------------------------------------------------
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`order_submit:${ip}`, 5, 3600);

    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ------------------------------------------------------------------
    // Step 2: Parse and Validate Body
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
      fullName,
      email,
      phone,
      isGuest,
      boxType,
      wantsPersonalization,
      preferences,
      sizes,
      promoCode,
      selectedAddressId,
      address,
      conversionToken,
    } = data as {
      fullName?: string;
      email?: string;
      phone?: string;
      isGuest?: boolean;
      boxType?: string;
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
      promoCode?: string | null;
      selectedAddressId?: string | null;
      address?: AddressInput;
      conversionToken?: string | null;
    };

    // Required fields
    if (!fullName || !email || !boxType) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета.' },
        { status: 400 },
      );
    }

    if (typeof fullName !== 'string' || typeof email !== 'string' || typeof boxType !== 'string') {
      return NextResponse.json(
        { error: 'Невалидни типове полета.' },
        { status: 400 },
      );
    }

    // Validate box type
    if (!VALID_BOX_TYPES.has(boxType)) {
      return NextResponse.json(
        { error: 'Невалиден тип кутия.' },
        { status: 400 },
      );
    }
    // Safe cast — validated above
    const validatedBoxType = boxType as BoxType;

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Невалиден имейл формат.' },
        { status: 400 },
      );
    }

    // Validate phone format (if provided)
    if (phone && typeof phone === 'string' && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Невалиден телефонен номер.' },
        { status: 400 },
      );
    }

    // Input length limits
    if (fullName.trim().length < 2 || fullName.length > MAX_NAME) {
      return NextResponse.json(
        { error: 'Името трябва да е между 2 и 200 символа.' },
        { status: 400 },
      );
    }
    if (email.length > MAX_EMAIL) {
      return NextResponse.json(
        { error: 'Имейлът е прекалено дълъг.' },
        { status: 400 },
      );
    }
    if (phone && typeof phone === 'string' && phone.length > MAX_PHONE) {
      return NextResponse.json(
        { error: 'Телефонният номер е прекалено дълъг.' },
        { status: 400 },
      );
    }
    if (
      preferences?.additionalNotes &&
      typeof preferences.additionalNotes === 'string' &&
      preferences.additionalNotes.length > MAX_NOTES
    ) {
      return NextResponse.json(
        { error: 'Бележките са прекалено дълги.' },
        { status: 400 },
      );
    }
    if (
      preferences?.sportOther &&
      typeof preferences.sportOther === 'string' &&
      preferences.sportOther.length > MAX_OTHER
    ) {
      return NextResponse.json({ error: 'Полето е прекалено дълго.' }, { status: 400 });
    }
    if (
      preferences?.flavorOther &&
      typeof preferences.flavorOther === 'string' &&
      preferences.flavorOther.length > MAX_OTHER
    ) {
      return NextResponse.json({ error: 'Полето е прекалено дълго.' }, { status: 400 });
    }
    if (
      preferences?.dietaryOther &&
      typeof preferences.dietaryOther === 'string' &&
      preferences.dietaryOther.length > MAX_OTHER
    ) {
      return NextResponse.json({ error: 'Полето е прекалено дълго.' }, { status: 400 });
    }

    // Guest cannot order subscription boxes
    if (isGuest && isSubscriptionBox(validatedBoxType)) {
      return NextResponse.json(
        { error: 'Абонаментните кутии изискват регистрация.' },
        { status: 403 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Authentication Check
    // ------------------------------------------------------------------
    const session = await verifySession();
    let userId: string | null = null;

    if (session) {
      userId = session.userId;
    } else if (!isGuest) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }
    // isGuest === true && no session → userId stays null

    // ------------------------------------------------------------------
    // Step 4: Handle Conversion Token (if present)
    // ------------------------------------------------------------------
    let preorder: Preorder | null = null;
    let effectiveBoxType: BoxType = validatedBoxType;
    let effectiveWantsPersonalization = wantsPersonalization ?? false;
    let effectivePreferences = preferences;
    let effectiveSizes = sizes;

    if (conversionToken) {
      preorder = await getPreorderByToken(conversionToken);
      if (!preorder) {
        return NextResponse.json(
          { error: 'Невалиден или изтекъл линк за преобразуване.' },
          { status: 400 },
        );
      }

      // Override client data from preorder record — prevents tampering
      effectiveBoxType = preorder.box_type as BoxType;
      effectiveWantsPersonalization = preorder.wants_personalization;
      effectivePreferences = {
        sports: preorder.sports ?? undefined,
        sportOther: preorder.sport_other ?? undefined,
        colors: preorder.colors ?? undefined,
        flavors: preorder.flavors ?? undefined,
        flavorOther: preorder.flavor_other ?? undefined,
        dietary: preorder.dietary ?? undefined,
        dietaryOther: preorder.dietary_other ?? undefined,
        additionalNotes: preorder.additional_notes ?? undefined,
      };
      effectiveSizes = {
        upper: preorder.size_upper ?? undefined,
        lower: preorder.size_lower ?? undefined,
      };
    }

    // ------------------------------------------------------------------
    // Step 5: Resolve Address
    // ------------------------------------------------------------------
    let addressSnapshot: ShippingAddressSnapshot;
    let addressId: string | null = null;

    if (userId && selectedAddressId) {
      // Authenticated user with saved address — verify ownership
      const savedAddress = await getAddressById(selectedAddressId, userId);
      if (!savedAddress) {
        return NextResponse.json(
          { error: 'Избраният адрес не е намерен.' },
          { status: 400 },
        );
      }

      addressSnapshot = {
        full_name: savedAddress.full_name,
        phone: savedAddress.phone,
        city: savedAddress.city,
        postal_code: savedAddress.postal_code,
        street_address: savedAddress.street_address,
        building_entrance: savedAddress.building_entrance,
        floor: savedAddress.floor,
        apartment: savedAddress.apartment,
        delivery_notes: savedAddress.delivery_notes,
      };
      addressId = selectedAddressId;
    } else if (address) {
      // Inline address — validate BG format
      const addressValidation = validateAddress(address);
      if (!addressValidation.valid) {
        return NextResponse.json(
          {
            error: 'Невалидни данни за адрес.',
            fieldErrors: addressValidation.errors,
          },
          { status: 400 },
        );
      }

      addressSnapshot = addressInputToSnapshot(address);

      // Auto-save address for authenticated users
      if (userId) {
        try {
          const newAddress = await createAddress({
            user_id: userId,
            label: address.label || null,
            full_name: address.fullName.trim(),
            phone: address.phone.trim() || null,
            city: address.city.trim(),
            postal_code: address.postalCode.trim(),
            street_address: address.streetAddress.trim(),
            building_entrance: address.buildingEntrance.trim() || null,
            floor: address.floor.trim() || null,
            apartment: address.apartment.trim() || null,
            delivery_notes: address.deliveryNotes.trim() || null,
            is_default: address.isDefault ?? false,
          });
          addressId = newAddress.id;
        } catch (addressError) {
          console.error('Failed to save address for authenticated user:', addressError);
          // Non-fatal — we still have the snapshot for the order
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Адресът е задължителен.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Step 6: Server-Side Price Calculation
    // ------------------------------------------------------------------
    const priceInfo = await calculatePrice(effectiveBoxType, promoCode);

    // ------------------------------------------------------------------
    // Step 7: Create Order
    // ------------------------------------------------------------------
    const orderData: OrderInsert = {
      user_id: userId,
      customer_email: email.trim().toLowerCase(),
      customer_full_name: fullName.trim(),
      customer_phone: phone?.trim() || null,
      shipping_address: addressSnapshot,
      address_id: addressId,
      box_type: effectiveBoxType,
      wants_personalization: effectiveWantsPersonalization,
      sports: effectivePreferences?.sports || null,
      sport_other: effectivePreferences?.sportOther || null,
      colors: effectivePreferences?.colors || null,
      flavors: effectivePreferences?.flavors || null,
      flavor_other: effectivePreferences?.flavorOther || null,
      dietary: effectivePreferences?.dietary || null,
      dietary_other: effectivePreferences?.dietaryOther || null,
      size_upper: effectiveSizes?.upper || null,
      size_lower: effectiveSizes?.lower || null,
      additional_notes: effectivePreferences?.additionalNotes || null,
      promo_code: priceInfo.promoCode,
      discount_percent: priceInfo.discountPercent ?? null,
      original_price_eur: priceInfo.originalPriceEur ?? null,
      final_price_eur: priceInfo.finalPriceEur ?? null,
      converted_from_preorder_id: preorder?.id || null,
    };

    const order = await createOrder(orderData);

    // ------------------------------------------------------------------
    // Step 8: Post-Creation Tasks
    // ------------------------------------------------------------------

    // 8a. Mark preorder as converted
    let conversionCompleted = false;
    if (preorder) {
      try {
        await markPreorderConverted(preorder.id, order.id);
        conversionCompleted = true;
      } catch (conversionError) {
        console.error(JSON.stringify({
          level: 'error',
          event: 'preorder_conversion_failed',
          preorderId: preorder.id,
          orderId: order.id,
          error: conversionError instanceof Error ? conversionError.message : String(conversionError),
          timestamp: new Date().toISOString(),
        }));
      }
    }

    // 8b. Increment promo code usage
    if (priceInfo.promoCode) {
      try {
        await incrementPromoCodeUsage(priceInfo.promoCode);
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
        // Non-fatal — the order was saved successfully
      }
    }

    // 8c. Send confirmation email (placeholder — fire-and-forget)
    let emailSent = false;
    try {
      // TODO: Implement order confirmation email workflow
      // similar to handlePreorderEmailWorkflow but with order data:
      // - order.order_number, effectiveBoxType, priceInfo, addressSnapshot
      console.log(JSON.stringify({
        level: 'info',
        event: 'order_email_placeholder',
        orderId: order.id,
        orderNumber: order.order_number,
        email: order.customer_email,
        timestamp: new Date().toISOString(),
      }));
      emailSent = false; // Will be true once email is implemented
    } catch (emailError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'order_email_failed',
        orderId: order.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        timestamp: new Date().toISOString(),
      }));
    }

    // 8d. Server-side Meta CAPI event tracking
    try {
      const clientIp =
        headersList.get('x-forwarded-for')?.split(',')[0] ||
        headersList.get('x-real-ip') ||
        '';
      const userAgent = headersList.get('user-agent') || '';
      const referer = headersList.get('referer') || '';

      // Parse name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Hash user data for Meta CAPI
      const [hashedEmail, hashedPhone, hashedFirstName, hashedLastName] = await Promise.all([
        hashForMeta(email),
        phone ? hashForMeta(phone) : Promise.resolve(undefined),
        firstName ? hashForMeta(firstName) : Promise.resolve(undefined),
        lastName ? hashForMeta(lastName) : Promise.resolve(undefined),
      ]);

      const capiResult = await trackLeadCapi({
        eventId: generateEventId(),
        sourceUrl:
          referer ||
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg'}/thank-you/order`,
        userData: {
          em: hashedEmail,
          ph: hashedPhone,
          fn: hashedFirstName,
          ln: hashedLastName,
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          fbc: (data as Record<string, unknown>).fbc as string | undefined,
          fbp: (data as Record<string, unknown>).fbp as string | undefined,
        },
        customData: {
          currency: 'EUR',
          value: priceInfo.finalPriceEur,
          content_name: effectiveBoxType,
          content_category: 'order',
          order_id: order.id,
        },
      });

      if (!capiResult.success) {
        console.warn('Meta CAPI event failed for order:', capiResult.error);
      }
    } catch (capiError) {
      // Log but don't fail the request
      console.error('Error sending Meta CAPI event:', capiError);
    }

    // ------------------------------------------------------------------
    // Step 9: Return Response
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        _meta: {
          emailSent,
          conversionCompleted,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
