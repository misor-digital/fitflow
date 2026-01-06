import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createPreorder, type PreorderFormData } from '@/lib/supabase';
import { handlePreorderEmailWorkflow } from '@/lib/email';
import { calculatePrice, validatePromoCode, incrementPromoCodeUsage } from '@/lib/data';
import { trackLeadCapi, hashForMeta, generateEventId } from '@/lib/analytics';
import { resolveClickToken } from '@/lib/marketing';

/**
 * Attribution data passed from client
 */
interface AttributionData {
  mc?: string;           // Marketing click token
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    console.log('Received preorder data:', JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.fullName || !data.email || !data.boxType) {
      console.error('Missing required fields:', { fullName: data.fullName, email: data.email, boxType: data.boxType });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Server-side promo code validation and price calculation
    // IMPORTANT: Never trust client-side price calculations
    const priceInfo = await calculatePrice(data.boxType, data.promoCode);
    const validatedPromo = await validatePromoCode(data.promoCode);

    console.log('Server-side price calculation:', {
      boxType: data.boxType,
      promoCode: data.promoCode,
      validatedPromo,
      priceInfo,
    });

    // =========================================================================
    // Marketing Attribution Resolution (Best-Effort, Never Blocking)
    // =========================================================================
    let marketingCampaignId: string | null = null;
    let marketingRecipientId: string | null = null;
    let marketingClickId: string | null = null;
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;

    const attribution: AttributionData | undefined = data.attribution;

    if (attribution) {
      // Capture UTM parameters directly (always available)
      utmSource = attribution.utm_source || null;
      utmMedium = attribution.utm_medium || null;
      utmCampaign = attribution.utm_campaign || null;

      // Resolve click token to get campaign/recipient IDs
      if (attribution.mc) {
        try {
          const clickData = await resolveClickToken(attribution.mc);
          if (clickData) {
            marketingCampaignId = clickData.campaignId;
            marketingRecipientId = clickData.recipientId;
            marketingClickId = clickData.clickId;
            // Use UTM values from click record if not provided directly
            utmSource = utmSource || clickData.utmSource;
            utmMedium = utmMedium || clickData.utmMedium;
            utmCampaign = utmCampaign || clickData.utmCampaign;
            
            console.log('Marketing attribution resolved:', {
              campaignId: marketingCampaignId,
              recipientId: marketingRecipientId,
              clickId: marketingClickId,
            });
          }
        } catch (attrError) {
          // Attribution resolution failed - log but don't block preorder
          console.warn('Failed to resolve marketing attribution:', attrError);
        }
      }
    }

    // Prepare the preorder data with server-validated prices and attribution
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
      discountPercent: priceInfo.discountPercent || null,
      originalPriceEur: priceInfo.originalPriceEur,
      finalPriceEur: priceInfo.finalPriceEur,
      // Marketing attribution (resolved server-side)
      marketingCampaignId,
      marketingRecipientId,
      marketingClickId,
      utmSource,
      utmMedium,
      utmCampaign,
    };

    console.log('Transformed preorder data:', JSON.stringify(preorderData, null, 2));

    // Save to Supabase
    const { data: preorder, error } = await createPreorder(preorderData);

    if (error) {
      console.error('Error saving preorder to database:', error.message);
      return NextResponse.json(
        { error: `Failed to save preorder: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Pre-order saved successfully:', {
      id: preorder?.id,
      fullName: preorder?.full_name,
      email: preorder?.email,
      boxType: preorder?.box_type,
      promoCode: preorder?.promo_code,
      discountPercent: preorder?.discount_percent,
      originalPriceEur: preorder?.original_price_eur,
      finalPriceEur: preorder?.final_price_eur,
      marketingCampaignId: preorder?.marketing_campaign_id,
      marketingRecipientId: preorder?.marketing_recipient_id,
      utmCampaign: preorder?.utm_campaign,
      timestamp: preorder?.created_at,
    });

    // Increment promo code usage if one was applied
    if (validatedPromo?.code) {
      try {
        await incrementPromoCodeUsage(validatedPromo.code);
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
        // Don't fail the request - preorder was saved successfully
      }
    }

    // Send confirmation email and add to contacts via Brevo
    if (preorder && priceInfo) {
      try {
        const { emailResult, contactResult } = await handlePreorderEmailWorkflow(preorder, priceInfo);
        
        if (!emailResult.success) {
          console.warn('Failed to send confirmation email:', emailResult.error);
          // Don't fail the request - preorder was saved successfully
        }
        
        if (!contactResult.success) {
          console.warn('Failed to add contact to Brevo:', contactResult.error);
          // Don't fail the request - this is not critical
        }
      } catch (emailError) {
        // Log but don't fail the request - the preorder was saved successfully
        console.error('Error in email workflow:', emailError);
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
      } else {
        console.log('Meta CAPI Lead event sent successfully');
      }
    } catch (capiError) {
      // Log but don't fail the request
      console.error('Error sending Meta CAPI event:', capiError);
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Pre-order submitted successfully',
        preorderId: preorder?.id
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
