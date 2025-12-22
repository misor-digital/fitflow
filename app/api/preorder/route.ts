import { NextResponse } from 'next/server';
import { createPreorder, type PreorderFormData } from '@/lib/supabase';
import { handlePreorderEmailWorkflow } from '@/lib/email';

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

    // Prepare the preorder data
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
      // Promo code and discount (Step 4)
      promoCode: data.promoCode || undefined,
      discount: data.discount ? {
        code: data.discount.code,
        discountType: data.discount.discountType,
        discountValue: data.discount.discountValue,
        discountAmount: data.discount.discountAmount,
        description: data.discount.description,
      } : undefined,
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
