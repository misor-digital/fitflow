import { NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/data/catalog';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'No promo code provided' },
        { status: 400 }
      );
    }

    const promo = await validatePromoCode(code);

    if (!promo) {
      return NextResponse.json({
        valid: false,
        code: code.toUpperCase(),
        discountPercent: 0,
      });
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discount_percent,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
