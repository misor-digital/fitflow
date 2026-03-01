import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  createOrder,
  createAddress,
  getAddressById,
  calculatePrice,
  incrementPromoCodeUsage,
  validatePromoCode,
  getPreorderByToken,
  markPreorderConverted,
  getDeliveryCycleById,
} from '@/lib/data';
import { validateAddress, addressInputToSnapshot } from '@/lib/order';
import { isSubscriptionBox, EMAIL_REGEX, isValidPhone } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { trackLeadCapi, hashForMeta, generateEventId } from '@/lib/analytics';
import type { OrderInsert, ShippingAddressSnapshot, Preorder, BoxType, OrderType } from '@/lib/supabase/types';
import type { AddressInput } from '@/lib/order';
import { sendTransactionalEmail, syncOrderToContact } from '@/lib/email/brevo';
import { syncPreorderConverted, syncOrderCustomer } from '@/lib/email/contact-sync';
import { generateConfirmationEmail } from '@/lib/email';
import type { ConfirmationEmailData } from '@/lib/email';
import { getBoxTypeNames } from '@/lib/data';

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
      selectedAddressId,
      address,
      deliveryMethod,
      speedyOffice,
      boxType,
      wantsPersonalization,
      preferences,
      sizes,
      promoCode,
      conversionToken,
      orderType: rawOrderType,
      deliveryCycleId,
      onBehalfOfUserId,
    } = data as {
      fullName?: string;
      email?: string;
      phone?: string;
      isGuest?: boolean;
      selectedAddressId?: string | null;
      address?: AddressInput;
      deliveryMethod?: string;
      speedyOffice?: { id: string; name: string; address?: string };
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
      conversionToken?: string | null;
      orderType?: string;
      deliveryCycleId?: string | null;
      onBehalfOfUserId?: string | null;
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

    // Validate order_type (optional, defaults to 'direct')
    const VALID_ORDER_TYPES: OrderType[] = ['onetime-mystery', 'onetime-revealed', 'direct'];
    const orderType: OrderType = rawOrderType && typeof rawOrderType === 'string'
      ? rawOrderType as OrderType
      : 'direct';

    if (!VALID_ORDER_TYPES.includes(orderType)) {
      return NextResponse.json(
        { error: 'Невалиден тип поръчка.' },
        { status: 400 },
      );
    }

    // 'subscription' order type is not allowed via direct order API
    if (rawOrderType === 'subscription') {
      return NextResponse.json(
        { error: 'Абонаментни поръчки не могат да се създават директно.' },
        { status: 400 },
      );
    }

    // Validate delivery_cycle_id (optional)
    let validatedCycleId: string | null = null;
    if (deliveryCycleId && typeof deliveryCycleId === 'string') {
      const cycle = await getDeliveryCycleById(deliveryCycleId);
      if (!cycle) {
        return NextResponse.json(
          { error: 'Посоченият цикъл на доставка не е намерен.' },
          { status: 400 },
        );
      }

      // Validate cycle status based on order type
      if (orderType === 'onetime-mystery' && cycle.status !== 'upcoming') {
        return NextResponse.json(
          { error: 'Mystery кутия може да се поръча само за предстоящ цикъл.' },
          { status: 400 },
        );
      }
      if (orderType === 'onetime-revealed') {
        if (cycle.status !== 'delivered' || !cycle.is_revealed) {
          return NextResponse.json(
            { error: 'Revealed кутия може да се поръча само за разкрит цикъл.' },
            { status: 400 },
          );
        }
      }

      validatedCycleId = cycle.id;
    }

    // Validate onBehalfOfUserId if present
    if (onBehalfOfUserId !== undefined && onBehalfOfUserId !== null) {
      if (typeof onBehalfOfUserId !== 'string' || onBehalfOfUserId.length === 0) {
        return NextResponse.json(
          { error: 'Невалиден идентификатор на клиент.' },
          { status: 400 },
        );
      }
    }

    // onBehalfOfUserId overrides guest mode
    if (onBehalfOfUserId && isGuest) {
      return NextResponse.json(
        { error: 'Не може да се прави поръчка от името на клиент в гост режим.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Authentication Check
    // ------------------------------------------------------------------
    const session = await verifySession();
    let userId: string | null = null;

    if (session) {
      // Staff submitting a guest order (e.g. admin converting a preorder
      // without creating a customer account) → keep userId null so the
      // order is created as a guest order under the customer's email.
      if (
        isGuest &&
        session.profile.user_type === 'staff' &&
        session.profile.staff_role &&
        STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
      ) {
        userId = null;
      } else {
        userId = session.userId;
      }
    } else if (!isGuest) {
      return NextResponse.json(
        { error: 'Изисква се вход в акаунта.' },
        { status: 401 },
      );
    }
    // isGuest === true && no session → userId stays null

    // ------------------------------------------------------------------
    // Step 3b: On-Behalf-Of Check (admin placing order for a customer)
    // ------------------------------------------------------------------
    if (onBehalfOfUserId) {
      // Verify the caller is an admin
      if (
        !session ||
        session.profile.user_type !== 'staff' ||
        !session.profile.staff_role ||
        !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
      ) {
        return NextResponse.json(
          { error: 'Нямате право да правите поръчки от името на друг потребител.' },
          { status: 403 },
        );
      }

      // Verify the target customer exists
      const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(onBehalfOfUserId);
      if (targetError || !targetUser?.user) {
        return NextResponse.json(
          { error: 'Клиентският акаунт не беше намерен.' },
          { status: 404 },
        );
      }

      // Override userId to the customer's
      console.log('[AdminAudit] On-behalf order', {
        action: 'on_behalf_order',
        adminId: session.userId,
        customerId: onBehalfOfUserId,
        customerEmail: targetUser.user.email,
        timestamp: new Date().toISOString(),
      });

      userId = onBehalfOfUserId;
    }

    // Fetch profile phone as fallback for customer_phone (defense-in-depth)
    let profilePhone: string | null = null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('phone')
        .eq('id', userId)
        .single();
      profilePhone = profile?.phone ?? null;
    }

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
    const effectiveDeliveryMethod: 'address' | 'speedy_office' =
      deliveryMethod === 'speedy_office' ? 'speedy_office' : 'address';

    if (effectiveDeliveryMethod === 'speedy_office') {
      // ── Office delivery ──────────────────────────────────────────
      if (!speedyOffice || !speedyOffice.id || !speedyOffice.name) {
        return NextResponse.json(
          { error: 'Моля, изберете офис на Speedy.' },
          { status: 400 },
        );
      }

      // Phone is required for Speedy office
      const recipientPhone = phone?.trim() || address?.phone?.trim();
      if (!recipientPhone) {
        return NextResponse.json(
          { error: 'Телефонът е задължителен за доставка до офис на Speedy.' },
          { status: 400 },
        );
      }

      const recipientName = fullName?.trim() || address?.fullName?.trim();
      if (!recipientName) {
        return NextResponse.json(
          { error: 'Името на получателя е задължително.' },
          { status: 400 },
        );
      }

      addressSnapshot = {
        full_name: recipientName,
        phone: recipientPhone,
        city: '',
        postal_code: '',
        street_address: '',
        building_entrance: null,
        floor: null,
        apartment: null,
        delivery_notes: address?.deliveryNotes?.trim() || null,
        delivery_method: 'speedy_office',
        speedy_office_id: speedyOffice.id,
        speedy_office_name: speedyOffice.name,
        speedy_office_address: speedyOffice.address || '',
      };
      // No address to save for office delivery
      addressId = null;

    } else if (userId && selectedAddressId) {
      // ── Authenticated user with saved address ────────────────────
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
      // ── Inline address ───────────────────────────────────────────
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
    // Step 6: Server-Side Price Calculation (with per-user promo validation)
    // ------------------------------------------------------------------
    let effectivePromoCode = promoCode ?? undefined;
    if (effectivePromoCode && userId) {
      const promoValid = await validatePromoCode(effectivePromoCode, userId);
      if (!promoValid) {
        effectivePromoCode = undefined;
      }
    }

    const priceInfo = await calculatePrice(effectiveBoxType, effectivePromoCode);

    // ------------------------------------------------------------------
    // Step 7: Create Order
    // ------------------------------------------------------------------
    const orderData: OrderInsert = {
      user_id: userId,
      customer_email: email.trim().toLowerCase(),
      customer_full_name: fullName.trim(),
      customer_phone: phone?.trim() || profilePhone || null,
      shipping_address: addressSnapshot,
      address_id: addressId,
      delivery_method: effectiveDeliveryMethod,
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
      delivery_cycle_id: validatedCycleId ?? undefined,
      order_type: orderType,
    };

    // For 'onetime-revealed' orders, skip personalization (contents are fixed)
    if (orderType === 'onetime-revealed') {
      orderData.wants_personalization = false;
      orderData.sports = null;
      orderData.sport_other = null;
      orderData.colors = null;
      orderData.flavors = null;
      orderData.flavor_other = null;
      orderData.dietary = null;
      orderData.dietary_other = null;
      orderData.size_upper = null;
      orderData.size_lower = null;
      orderData.additional_notes = null;
    }

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

        // Sync preorder conversion to Brevo (fire-and-forget)
        syncPreorderConverted({ email: preorder.email }).catch(console.error);
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

    // 8b. Increment promo code usage (with per-user tracking)
    if (priceInfo.promoCode) {
      try {
        await incrementPromoCodeUsage(
          priceInfo.promoCode,
          session?.userId,
          order.id,
        );
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
        // Non-fatal — the order was saved successfully
      }
    }

    // 8c. Send confirmation email (fire-and-forget)
    let emailSent = false;
    try {
      // Build display name for box type
      const boxTypeNames = await getBoxTypeNames();
      const boxTypeDisplay = boxTypeNames[effectiveBoxType] ?? effectiveBoxType;

      // Build ConfirmationEmailData from available order data
      const emailData: ConfirmationEmailData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        boxType: effectiveBoxType,
        boxTypeDisplay,
        wantsPersonalization: effectiveWantsPersonalization,
        orderId: order.order_number,
        sports: effectivePreferences?.sports ?? undefined,
        sportOther: effectivePreferences?.sportOther ?? undefined,
        colors: effectivePreferences?.colors ?? undefined,
        flavors: effectivePreferences?.flavors ?? undefined,
        flavorOther: effectivePreferences?.flavorOther ?? undefined,
        sizeUpper: effectiveSizes?.upper ?? undefined,
        sizeLower: effectiveSizes?.lower ?? undefined,
        dietary: effectivePreferences?.dietary ?? undefined,
        dietaryOther: effectivePreferences?.dietaryOther ?? undefined,
        additionalNotes: effectivePreferences?.additionalNotes ?? undefined,
        hasPromoCode: !!priceInfo.promoCode,
        promoCode: priceInfo.promoCode ?? undefined,
        discountPercent: priceInfo.discountPercent ?? undefined,
        originalPriceEur: priceInfo.originalPriceEur ?? undefined,
        originalPriceBgn: priceInfo.originalPriceBgn ?? undefined,
        finalPriceEur: priceInfo.finalPriceEur ?? undefined,
        finalPriceBgn: priceInfo.finalPriceBgn ?? undefined,
        discountAmountEur: priceInfo.discountAmountEur ?? undefined,
        discountAmountBgn: priceInfo.discountAmountBgn ?? undefined,
        deliveryMethod: effectiveDeliveryMethod as 'address' | 'speedy_office',
        speedyOfficeName: addressSnapshot.speedy_office_name ?? null,
        speedyOfficeAddress: addressSnapshot.speedy_office_address ?? null,
        shippingAddress: {
          fullName: addressSnapshot.full_name,
          phone: addressSnapshot.phone,
          city: addressSnapshot.city,
          postalCode: addressSnapshot.postal_code,
          streetAddress: addressSnapshot.street_address,
          buildingEntrance: addressSnapshot.building_entrance,
          floor: addressSnapshot.floor,
          apartment: addressSnapshot.apartment,
          deliveryNotes: addressSnapshot.delivery_notes,
        },
      };

      // Determine email type based on whether this is a conversion
      const emailType = 'order';

      // Generate HTML
      const htmlContent = generateConfirmationEmail(emailData, emailType);

      // Send via Brevo wrapper (auto-logs to email_send_log)
      const result = await sendTransactionalEmail({
        to: { email: email.trim().toLowerCase(), name: fullName.trim() },
        subject: 'FitFlow — Поръчката ви е потвърдена!',
        htmlContent,
        tags: ['order', preorder ? 'preorder-conversion' : 'confirmation'],
        category: 'order-confirmation',
        relatedEntityType: 'order',
        relatedEntityId: order.id,
      });

      emailSent = result.success;

      // Sync customer to Brevo contacts (fire-and-forget)
      syncOrderToContact(
        email.trim().toLowerCase(),
        1,
        new Date().toISOString().split('T')[0],
        effectiveBoxType
      ).catch((err) => console.error('Failed to sync contact:', err));

      // Ensure customer is in the customers list (fire-and-forget)
      syncOrderCustomer({
        email: email.trim().toLowerCase(),
        orderDate: new Date().toISOString(),
        boxType: effectiveBoxType,
      }).catch(console.error);

    } catch (emailError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'order_email_failed',
        orderId: order.id,
        error: emailError instanceof Error ? emailError.message : 'Unknown',
      }));
      emailSent = false;
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
        finalPriceEur: priceInfo.finalPriceEur ?? null,
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
