import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { createPreorder, type PreorderFormData } from '@/lib/supabase';
import { handlePreorderEmailWorkflow } from '@/lib/email';
import { calculatePrice, validatePromoCode, incrementPromoCodeUsage } from '@/lib/data';
import { trackLeadCapi, hashForMeta, generateEventId } from '@/lib/analytics';
import { EMAIL_REGEX } from '@/lib/preorder/validation';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { verifySession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Input length limits
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 20;
const MAX_NOTES = 1000;
const MAX_OTHER = 200;

const VALID_BOX_TYPES = new Set([
  'monthly-standard', 'monthly-premium', 'monthly-premium-monthly',
  'monthly-premium-seasonal', 'onetime-standard', 'onetime-premium',
]);

/**
 * @deprecated Preorder creation is disabled — orders have replaced preorders.
 * Code is kept below the 410 guard for emergency rollback.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Preorder creation is disabled — orders have replaced preorders
  return NextResponse.json(
    { error: 'Предпоръчките са деактивирани. Моля, използвайте /order.' },
    { status: 410 } // Gone
  );

  // --- Kept for emergency rollback — do not delete ---
  // eslint-disable-next-line no-unreachable
  try {
    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`preorder:${ip}`, 5, 3600); // 5 per hour

    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.fullName || !data.email || !data.boxType) {
      console.error('Missing required fields:', { fullName: data.fullName, email: data.email, boxType: data.boxType });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Input length validation
    if (typeof data.fullName === 'string' && data.fullName.length > MAX_NAME) {
      return NextResponse.json({ error: 'Името е прекалено дълго' }, { status: 400 });
    }
    if (typeof data.email === 'string' && data.email.length > MAX_EMAIL) {
      return NextResponse.json({ error: 'Имейлът е прекалено дълъг' }, { status: 400 });
    }
    if (data.phone && typeof data.phone === 'string' && data.phone.length > MAX_PHONE) {
      return NextResponse.json({ error: 'Телефонният номер е прекалено дълъг' }, { status: 400 });
    }
    if (data.additionalNotes && typeof data.additionalNotes === 'string' && data.additionalNotes.length > MAX_NOTES) {
      return NextResponse.json({ error: 'Бележките са прекалено дълги' }, { status: 400 });
    }
    if (data.sportOther && typeof data.sportOther === 'string' && data.sportOther.length > MAX_OTHER) {
      return NextResponse.json({ error: 'Полето е прекалено дълго' }, { status: 400 });
    }
    if (data.flavorOther && typeof data.flavorOther === 'string' && data.flavorOther.length > MAX_OTHER) {
      return NextResponse.json({ error: 'Полето е прекалено дълго' }, { status: 400 });
    }
    if (data.dietaryOther && typeof data.dietaryOther === 'string' && data.dietaryOther.length > MAX_OTHER) {
      return NextResponse.json({ error: 'Полето е прекалено дълго' }, { status: 400 });
    }

    // Validate box type
    if (!VALID_BOX_TYPES.has(data.boxType)) {
      return NextResponse.json({ error: 'Невалиден тип кутия' }, { status: 400 });
    }

    // Server-side promo code validation and price calculation
    // IMPORTANT: Never trust client-side price calculations
    const priceInfo = await calculatePrice(data.boxType, data.promoCode);
    const validatedPromo = await validatePromoCode(data.promoCode);

    // Prepare the preorder data with server-validated prices
    const preorderData: PreorderFormData = {
      boxType: data.boxType,
      wantsPersonalization: data.wantsPersonalization ?? false,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      // Personalization preferences (Step 2)
      sports: data.preferences?.sports || data.sports,
      sportOther: data.preferences?.sportOther || data.sportOther,
      colors: data.preferences?.colors || data.colors,
      flavors: data.preferences?.flavors || data.flavors,
      flavorOther: data.preferences?.flavorOther || data.flavorOther,
      sizeUpper: data.sizes?.upper || data.sizeUpper,
      sizeLower: data.sizes?.lower || data.sizeLower,
      dietary: data.preferences?.dietary || data.dietary,
      dietaryOther: data.preferences?.dietaryOther || data.dietaryOther,
      additionalNotes: data.preferences?.additionalNotes || data.additionalNotes,
      // Server-validated promo code and prices
      promoCode: validatedPromo?.code || null,
      discountPercent: priceInfo.discountPercent ?? null,
      originalPriceEur: priceInfo.originalPriceEur,
      finalPriceEur: priceInfo.finalPriceEur,
    };

    // Save to Supabase
    const { data: preorder, error } = await createPreorder(preorderData);

    if (error) {
      console.error('Error saving preorder to database:', error?.message);
      return NextResponse.json(
        { error: `Failed to save preorder: ${error?.message}` },
        { status: 500 }
      );
    }

    // Auto-link if user is authenticated
    const session = await verifySession();
    if (session && preorder) {
      await supabaseAdmin
        .from('preorders')
        .update({ user_id: session!.userId })
        .eq('id', preorder!.id);
    }

    // Increment promo code usage if one was applied
    if (validatedPromo?.code) {
      try {
        await incrementPromoCodeUsage(validatedPromo!.code);
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
        // Don't fail the request - preorder was saved successfully
      }
    }

    // Send confirmation email and add to contacts via Brevo
    let emailResult: { success: boolean; error?: string } | undefined;
    let contactResult: { success: boolean; error?: string } | undefined;

    if (preorder && priceInfo) {
      try {
        const workflowResult = await handlePreorderEmailWorkflow(preorder!, priceInfo!);
        emailResult = workflowResult.emailResult;
        contactResult = workflowResult.contactResult;
        
        if (!emailResult!.success) {
          console.error(JSON.stringify({
            level: 'error',
            event: 'email_send_failed',
            preorderId: preorder?.id,
            email: preorder?.email,
            error: emailResult!.error,
            timestamp: new Date().toISOString(),
          }));
        }
        
        if (!contactResult!.success) {
          console.error(JSON.stringify({
            level: 'error',
            event: 'contact_add_failed',
            preorderId: preorder?.id,
            email: preorder?.email,
            error: contactResult!.error,
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (emailError) {
        // Log but don't fail the request - the preorder was saved successfully
        console.error(JSON.stringify({
          level: 'error',
          event: 'email_workflow_exception',
          preorderId: preorder?.id,
          error: emailError instanceof Error ? (emailError as Error).message : String(emailError),
          timestamp: new Date().toISOString(),
        }));
      }
    }

    // Track Lead event via Meta Conversions API (server-side)
    // This provides better attribution than browser-only tracking
    try {
      const headersList = await headers();
      const clientIp = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '';
      const userAgent = headersList.get('user-agent') || '';
      const referer = headersList.get('referer') || '';
      
      // Parse name into first and last name
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Hash user data for Meta CAPI
      const [hashedEmail, hashedPhone, hashedFirstName, hashedLastName] = await Promise.all([
        hashForMeta(data.email),
        data.phone ? hashForMeta(data.phone) : Promise.resolve(undefined),
        firstName ? hashForMeta(firstName) : Promise.resolve(undefined),
        lastName ? hashForMeta(lastName) : Promise.resolve(undefined),
      ]);
      
      const capiResult = await trackLeadCapi({
        eventId: generateEventId(),
        sourceUrl: referer || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg'}/thank-you/preorder`,
        userData: {
          em: hashedEmail,
          ph: hashedPhone,
          fn: hashedFirstName,
          ln: hashedLastName,
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          // fbc and fbp would come from cookies if available
          fbc: data.fbc,
          fbp: data.fbp,
        },
        customData: {
          currency: 'EUR',
          value: priceInfo.finalPriceEur,
          content_name: data.boxType,
          content_category: 'preorder',
          order_id: preorder?.id,
        },
      });
      
      if (!capiResult.success) {
        console.warn('Meta CAPI Lead event failed:', capiResult.error);
      }
    } catch (capiError) {
      // Log but don't fail the request
      console.error('Error sending Meta CAPI event:', capiError);
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Pre-order submitted successfully',
        preorderId: preorder?.id,
        _meta: {
          emailSent: emailResult?.success ?? false,
          contactAdded: contactResult?.success ?? false,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing pre-order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
