import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { CUSTOMER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getAddressByIdAdmin,
  updateAddressAdmin,
  deleteAddressAdmin,
} from '@/lib/data';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import {
  sanitizeAddressBody,
  validateFieldLengths,
  validatePhone,
  validateAddressDomain,
  buildAddressUpdate,
} from '@/lib/order/address-write';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

// ============================================================================
// GET /api/admin/address/:id - Get single address
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !CUSTOMER_VIEW_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    const address = await getAddressByIdAdmin(id);
    if (!address) {
      return NextResponse.json(
        { error: 'Адресът не е намерен.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('GET /api/admin/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на адреса.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/admin/address/:id - Update address
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_address_update:${ip}`, 20, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    // Verify address exists
    const existing = await getAddressByIdAdmin(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Адресът не е намерен.' },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Handle "set default only" - no full validation needed
    const isDefaultOnly =
      typeof body.isDefault === 'boolean' &&
      Object.keys(body).length === 1;

    if (isDefaultOnly) {
      const address = await updateAddressAdmin(id, {
        is_default: body.isDefault,
      });
      return NextResponse.json({ address });
    }

    const sanitized = sanitizeAddressBody(body);

    // Length validation
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

    const address = await updateAddressAdmin(id, updateData);
    return NextResponse.json({ address });
  } catch (error) {
    console.error('PUT /api/admin/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при обновяване на адреса.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/admin/address/:id - Delete address
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json(
        { error: 'Неоторизиран достъп.' },
        { status: 401 },
      );
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json(
        { error: 'Нямате достъп до тази операция.' },
        { status: 403 },
      );
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_address_delete:${ip}`, 20, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Невалиден идентификатор.' },
        { status: 400 },
      );
    }

    // Verify address exists before deleting
    const existing = await getAddressByIdAdmin(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Адресът не е намерен.' },
        { status: 404 },
      );
    }

    await deleteAddressAdmin(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/address/[id] error:', error);
    return NextResponse.json(
      { error: 'Грешка при изтриване на адреса.' },
      { status: 500 },
    );
  }
}
