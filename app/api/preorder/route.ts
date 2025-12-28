import { NextResponse } from 'next/server';
import { createPreorder, type PreorderFormData } from '@/lib/supabase';
import { handlePreorderEmailWorkflow } from '@/lib/email';
import { calculatePrice, validatePromoCode, incrementPromoCodeUsage } from '@/lib/data/catalog';

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
    const validatedPromo = data.promoCode ? await validatePromoCode(data.promoCode) : null;

    console.log('Server-side price calculation:', {
      boxType: data.boxType,
      promoCode: data.promoCode,
      validatedPromo: validatedPromo ? { code: validatedPromo.code, discount: validatedPromo.discount_percent } : null,
      priceInfo,
    });

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
      promoCode: priceInfo.promoCode || null,
      discountPercent: priceInfo.discountPercent || null,
      originalPriceEur: priceInfo.originalPriceEur,
      finalPriceEur: priceInfo.finalPriceEur,
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

    // Increment promo code usage if a valid promo was applied
    if (priceInfo.promoCode) {
      try {
        await incrementPromoCodeUsage(priceInfo.promoCode);
      } catch (promoError) {
        console.warn('Failed to increment promo code usage:', promoError);
        // Non-critical error, don't fail the request
      }
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
      timestamp: preorder?.created_at,
    });

    // Send confirmation email and add to contacts via Brevo
    if (preorder) {
      try {
        const { emailResult, contactResult } = await handlePreorderEmailWorkflow(preorder);
        
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
