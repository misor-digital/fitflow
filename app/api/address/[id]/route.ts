import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import {
  sanitizeAddressBody,
  validateFieldLengths,
  validatePhone,
  validateAddressDomain,
  buildAddressUpdate,
} from '@/lib/order/address-write';

/** Rate limit: 20 requests per minute */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60;

type RouteParams = { params: Promise<{ id: string }> };

// ============================================================================
// GET /api/address/:id - Get a specific address
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const address = await getAddressById(id, session.userId);
    if (!address) {
      return NextResponse.json(
        { error: 'Адресът не е намерен' },
        { status: 404 },
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('GET /api/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на адреса' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/address/:id - Update an address
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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
      `address_update_${session.userId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
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

    // Build update payload - nulls out inapplicable fields when switching method
    const updateData = buildAddressUpdate(sanitized);

    try {
      const address = await updateAddress(id, session.userId, updateData);
      return NextResponse.json({ address });
    } catch {
      return NextResponse.json(
        { error: 'Адресът не е намерен' },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error('PUT /api/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при обновяване на адреса' },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/address/:id - Delete an address
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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
      `address_delete_${session.userId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;

    // Ownership check - 404 for not-found AND not-owned
    const address = await getAddressById(id, session.userId);
    if (!address) {
      return NextResponse.json(
        { error: 'Адресът не е намерен' },
        { status: 404 },
      );
    }

    await deleteAddress(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при изтриване на адреса' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/address/:id - Set as default address
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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
      `address_default_${session.userId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW,
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;

    // Body must contain { isDefault: true }
    const body = await request.json();
    if (body.isDefault !== true) {
      return NextResponse.json(
        { error: 'Невалидна заявка - очаква се { isDefault: true }' },
        { status: 400 },
      );
    }

    // Ownership check - 404 for not-found AND not-owned
    const address = await getAddressById(id, session.userId);
    if (!address) {
      return NextResponse.json(
        { error: 'Адресът не е намерен' },
        { status: 404 },
      );
    }

    await setDefaultAddress(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при задаване на адрес по подразбиране' },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helpers - sanitizeAddressBody imported from ../route
// ============================================================================
