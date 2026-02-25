/**
 * Promo Code Validation API Route
 * Validates promo codes server-side and returns discount info
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validatePromoCode } from '@/lib/data';
import { verifySession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/utils/rateLimit';

/**
 * GET /api/promo/validate?code=FITFLOW10
 * Validates a promo code and returns discount info if valid
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`promo:${ip}`, 20, 60); // 20 per minute

    if (!withinLimit) {
      return NextResponse.json(
        { valid: false, error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      );
    }

    // Try to get the current user session (non-throwing)
    const session = await verifySession();

    const promo = await validatePromoCode(code, session?.userId);

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
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`promo:${ip}`, 20, 60); // 20 per minute

    if (!withinLimit) {
      return NextResponse.json(
        { valid: false, error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const code = body.code;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      );
    }

    // Try to get the current user session (non-throwing)
    const session = await verifySession();

    const promo = await validatePromoCode(code, session?.userId);

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
