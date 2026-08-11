import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { CUSTOMER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import {
  getAddressesByUser,
  createAddress,
  countAddressesByUser,
  syncPhoneToProfile,
  unsetDefaultAddresses,
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
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// GET /api/admin/address?userId=<uuid> - List addresses for a user
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`admin_address_list:${ip}`, 30, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Невалиден или липсващ userId параметър.' },
        { status: 400 },
      );
    }

    const addresses = await getAddressesByUser(userId);
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('GET /api/admin/address error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на адресите.' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/admin/address - Create address for a user
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const withinLimit = await checkRateLimit(`admin_address_create:${ip}`, 20, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много заявки. Опитайте по-късно.' },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Validate userId
    const userId =
      typeof body.userId === 'string' ? body.userId.trim() : undefined;
    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Невалиден или липсващ userId.' },
        { status: 400 },
      );
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Потребителят не е намерен.' },
        { status: 404 },
      );
    }

    // Max addresses check
    const count = await countAddressesByUser(userId);
    if (count >= MAX_ADDRESSES) {
      return NextResponse.json(
        { error: 'Максимум 10 адреса на потребител.' },
        { status: 400 },
      );
    }

    // Sanitize
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

    // Build insert payload - use target userId, not session userId
    const insertData = buildAddressInsert(userId, sanitized);

    // Explicitly unset other defaults before insert (defense against trigger edge cases)
    if (insertData.is_default) {
      await unsetDefaultAddresses(userId);
    }

    const address = await createAddress(insertData);

    // Sync phone to profile if profile phone is empty
    let phoneSynced = false;
    if (insertData.phone) {
      try {
        phoneSynced = await syncPhoneToProfile(userId, insertData.phone);
      } catch (err) {
        console.error('Failed to sync phone to profile:', err);
      }
    }

    return NextResponse.json({ address, phoneSynced }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/address error:', error);
    return NextResponse.json(
      { error: 'Грешка при създаване на адрес.' },
      { status: 500 },
    );
  }
}
