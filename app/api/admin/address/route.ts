import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { CUSTOMER_VIEW_ROLES, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { getAddressesByUser, createAddress, countAddressesByUser } from '@/lib/data';
import { validateAddress, validateSpeedyOffice } from '@/lib/order';
import type { SpeedyOfficeSelection } from '@/lib/order';
import { isValidPhone } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sanitizeAddressBody,
  validateFieldLengths,
} from '@/app/api/address/route';
import type { AddressInsert } from '@/lib/supabase/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_ADDRESSES = 10;

// ============================================================================
// GET /api/admin/address?userId=<uuid> — List addresses for a user
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
// POST /api/admin/address — Create address for a user
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

    // Phone format validation
    if (sanitized.phone && !isValidPhone(sanitized.phone)) {
      return NextResponse.json(
        {
          error: 'Невалидни данни',
          details: [
            {
              field: 'phone',
              message:
                'Моля, въведете само цифри и символи за форматиране (+, -, (, ), интервал)',
              code: 'invalid_format',
            },
          ],
        },
        { status: 400 },
      );
    }

    const deliveryMethod = sanitized.deliveryMethod ?? 'address';

    // Domain validation — conditional on delivery method
    if (deliveryMethod === 'speedy_office') {
      const officeSelection: SpeedyOfficeSelection | null =
        sanitized.speedyOfficeId && sanitized.speedyOfficeName
          ? {
              id: sanitized.speedyOfficeId,
              name: sanitized.speedyOfficeName,
              address: sanitized.speedyOfficeAddress ?? '',
            }
          : null;

      const validationResult = validateSpeedyOffice(
        {
          label: sanitized.label ?? '',
          fullName: sanitized.fullName ?? '',
          phone: sanitized.phone ?? '',
          city: '',
          postalCode: '',
          streetAddress: '',
          buildingEntrance: '',
          floor: '',
          apartment: '',
          deliveryNotes: sanitized.deliveryNotes ?? '',
          isDefault: sanitized.isDefault ?? false,
        },
        officeSelection,
      );

      if (!validationResult.valid) {
        return NextResponse.json(
          { error: 'Невалидни данни', details: validationResult.errors },
          { status: 400 },
        );
      }
    } else {
      const validationResult = validateAddress({
        label: sanitized.label ?? '',
        fullName: sanitized.fullName ?? '',
        phone: sanitized.phone ?? '',
        city: sanitized.city ?? '',
        postalCode: sanitized.postalCode ?? '',
        streetAddress: sanitized.streetAddress ?? '',
        buildingEntrance: sanitized.buildingEntrance ?? '',
        floor: sanitized.floor ?? '',
        apartment: sanitized.apartment ?? '',
        deliveryNotes: sanitized.deliveryNotes ?? '',
        isDefault: sanitized.isDefault ?? false,
      });

      if (!validationResult.valid) {
        return NextResponse.json(
          { error: 'Невалидни данни', details: validationResult.errors },
          { status: 400 },
        );
      }
    }

    // Build insert payload — use target userId, not session userId
    const insertData: AddressInsert =
      deliveryMethod === 'speedy_office'
        ? {
            user_id: userId,
            delivery_method: 'speedy_office',
            full_name: sanitized.fullName!,
            phone: sanitized.phone || null,
            speedy_office_id: sanitized.speedyOfficeId!,
            speedy_office_name: sanitized.speedyOfficeName!,
            speedy_office_address: sanitized.speedyOfficeAddress || null,
            label: sanitized.label || null,
            delivery_notes: sanitized.deliveryNotes || null,
            is_default: sanitized.isDefault ?? false,
          }
        : {
            user_id: userId,
            delivery_method: 'address',
            full_name: sanitized.fullName!,
            city: sanitized.city!,
            postal_code: sanitized.postalCode!,
            street_address: sanitized.streetAddress!,
            label: sanitized.label || null,
            phone: sanitized.phone || null,
            building_entrance: sanitized.buildingEntrance || null,
            floor: sanitized.floor || null,
            apartment: sanitized.apartment || null,
            delivery_notes: sanitized.deliveryNotes || null,
            is_default: sanitized.isDefault ?? false,
          };

    const address = await createAddress(insertData);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/address error:', error);
    return NextResponse.json(
      { error: 'Грешка при създаване на адрес.' },
      { status: 500 },
    );
  }
}
