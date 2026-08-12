import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getAddressesByUser,
  createAddress,
  countAddressesByUser,
  syncPhoneToProfile,
} from '@/lib/data';
import {
  MAX_ADDRESSES,
  sanitizeAddressBody,
  validateFieldLengths,
  validatePhone,
  validateAddressDomain,
  buildAddressInsert,
} from '@/lib/order/address-write';
import { checkRateLimit } from '@/lib/utils/rateLimit';

/** Rate limit: 20 requests per minute */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60;

// ============================================================================
// GET /api/address - List current user's addresses
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 },
      );
    }

    const addresses = await getAddressesByUser(session.userId);
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('GET /api/address error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на адресите' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/address - Create a new address
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 },
      );
    }

    // Rate limiting
    const withinLimit = await checkRateLimit(
      `address_create_${session.userId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    // Max addresses check
    const count = await countAddressesByUser(session.userId);
    if (count >= MAX_ADDRESSES) {
      return NextResponse.json(
        { error: 'Максимум 10 адреса на потребител' },
        { status: 400 },
      );
    }

    // Parse body
    const body = await request.json();

    // Sanitize - trim all string fields
    const sanitized = sanitizeAddressBody(body);

    // Server-side length validation
    const lengthErrors = validateFieldLengths(sanitized);
    if (lengthErrors.length > 0) {
      return NextResponse.json(
        { error: 'Невалидни данни', details: lengthErrors },
        { status: 400 },
      );
    }

    // Phone validation (required for all delivery methods)
    const phoneErrors = validatePhone(sanitized.phone);
    if (phoneErrors.length > 0) {
      return NextResponse.json(
        { error: 'Невалидни данни', details: phoneErrors },
        { status: 400 },
      );
    }

    // Domain validation - conditional on delivery method
    const validationResult = validateAddressDomain(sanitized);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Невалидни данни', details: validationResult.errors },
        { status: 400 },
      );
    }

    // Build insert payload
    const insertData = buildAddressInsert(session.userId, sanitized);

    const address = await createAddress(insertData);

    // Sync phone to profile if profile phone is empty
    let phoneSynced = false;
    if (insertData.phone) {
      try {
        phoneSynced = await syncPhoneToProfile(session.userId, insertData.phone);
      } catch (err) {
        console.error('Failed to sync phone to profile:', err);
      }
    }

    return NextResponse.json({ address, phoneSynced }, { status: 201 });
  } catch (error) {
    console.error('POST /api/address error:', error);
    return NextResponse.json(
      { error: 'Грешка при създаване на адрес' },
      { status: 500 },
    );
  }
}
