import { NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/promo';

export async function POST(request: Request) {
  try {
    const { code, boxType } = await request.json();

    // Validate required fields
    if (!boxType) {
      return NextResponse.json(
        { error: 'Липсва тип на кутията' },
        { status: 400 }
      );
    }

    // Validate the promo code
    const result = validatePromoCode(code || '', boxType);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error 
        },
        { status: 200 }
      );
    }

    // Return success with discount info if applicable
    return NextResponse.json(
      {
        valid: true,
        discount: result.discount || null,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: 'Грешка при валидиране на промо кода' },
      { status: 500 }
    );
  }
}
