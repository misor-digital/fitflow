/**
 * Promo Code Validation API Route
 * Validates promo codes server-side and returns discount info
 */

import { NextResponse } from 'next/server';
import { validatePromoCode, getAppliedPromo } from '@/lib/data';

/**
 * GET /api/promo/validate?code=FITFLOW10
 * Validates a promo code and returns discount info if valid
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const promo = await validatePromoCode(code);

    if (!promo) {
      return NextResponse.json({
        valid: false,
        code: code.toUpperCase(),
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
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promo/validate
 * Body: { code: string }
 * Alternative POST method for promo validation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = body.code;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const appliedPromo = await getAppliedPromo(code);

    if (!appliedPromo) {
      return NextResponse.json({
        valid: false,
        code: code.toUpperCase(),
      });
    }

    return NextResponse.json({
      valid: true,
      code: appliedPromo.code,
      discountPercent: appliedPromo.discountPercent,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
