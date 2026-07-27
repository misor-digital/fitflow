import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getAddressesByUser,
  createAddress,
  countAddressesByUser,
} from '@/lib/data';
import { validateAddress, validateSpeedyOffice } from '@/lib/order';
import type { SpeedyOfficeSelection } from '@/lib/order';
import { isValidPhone } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AddressInsert } from '@/lib/supabase/types';

// Field length limits
const MAX_FIRST_NAME = 100;
const MAX_LAST_NAME = 100;
const MAX_CITY = 100;
const MAX_STREET = 500;
const MAX_LABEL = 50;
const MAX_OPTIONAL_FIELD = 50; // buildingEntrance, floor, apartment
const MAX_DELIVERY_NOTES = 500;
const MAX_SPEEDY_OFFICE_NAME = 200;
const MAX_SPEEDY_OFFICE_ADDRESS = 500;
const MAX_SPEEDY_OFFICE_ID = 100;
const MAX_ADDRESSES = 10;

const VALID_DELIVERY_METHODS = ['address', 'speedy_office', 'speedy_automat'] as const;
type DeliveryMethodValue = (typeof VALID_DELIVERY_METHODS)[number];

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
    if (!sanitized.phone?.trim()) {
      return NextResponse.json(
        {
          error: 'Невалидни данни',
          details: [{ field: 'phone', message: 'Телефонният номер е задължителен', code: 'required' }],
        },
        { status: 400 },
      );
    }
    if (!isValidPhone(sanitized.phone)) {
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

    // Domain validation - conditional on delivery method
    if (deliveryMethod === 'speedy_office' || deliveryMethod === 'speedy_automat') {
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
          firstName: sanitized.firstName ?? '',
          lastName: sanitized.lastName ?? '',
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
        firstName: sanitized.firstName ?? '',
        lastName: sanitized.lastName ?? '',
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

    // Build insert payload - conditional on delivery method
    const userLabel = sanitized.label || null;

    const insertData: AddressInsert =
      deliveryMethod === 'speedy_office' || deliveryMethod === 'speedy_automat'
        ? {
            user_id: session.userId,
            delivery_method: deliveryMethod,
            first_name: sanitized.firstName!,
            last_name: sanitized.lastName!,
            phone: sanitized.phone || null,
            speedy_office_id: sanitized.speedyOfficeId!,
            speedy_office_name: sanitized.speedyOfficeName!,
            speedy_office_address: sanitized.speedyOfficeAddress || null,
            label: userLabel,
            delivery_notes: sanitized.deliveryNotes || null,
            is_default: sanitized.isDefault ?? false,
          }
        : {
            user_id: session.userId,
            delivery_method: 'address',
            first_name: sanitized.firstName!,
            last_name: sanitized.lastName!,
            city: sanitized.city!,
            postal_code: sanitized.postalCode!,
            street_address: sanitized.streetAddress!,
            label: userLabel,
            phone: sanitized.phone || null,
            building_entrance: sanitized.buildingEntrance || null,
            floor: sanitized.floor || null,
            apartment: sanitized.apartment || null,
            delivery_notes: sanitized.deliveryNotes || null,
            is_default: sanitized.isDefault ?? false,
          };

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

// ============================================================================
// Helpers
// ============================================================================

export interface SanitizedBody {
  deliveryMethod?: DeliveryMethodValue;
  label?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  streetAddress?: string;
  buildingEntrance?: string;
  floor?: string;
  apartment?: string;
  deliveryNotes?: string;
  isDefault?: boolean;
  speedyOfficeId?: string;
  speedyOfficeName?: string;
  speedyOfficeAddress?: string;
}

/**
 * Trim all string fields from the request body.
 */
export function sanitizeAddressBody(body: Record<string, unknown>): SanitizedBody {
  const trimStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v.trim() : undefined;

  const rawMethod = trimStr(body.deliveryMethod);
  const deliveryMethod: DeliveryMethodValue =
    rawMethod && (VALID_DELIVERY_METHODS as readonly string[]).includes(rawMethod)
      ? (rawMethod as DeliveryMethodValue)
      : 'address';

  return {
    deliveryMethod,
    label: trimStr(body.label),
    firstName: trimStr(body.firstName),
    lastName: trimStr(body.lastName),
    phone: trimStr(body.phone),
    city: trimStr(body.city),
    postalCode: trimStr(body.postalCode),
    streetAddress: trimStr(body.streetAddress),
    buildingEntrance: trimStr(body.buildingEntrance),
    floor: trimStr(body.floor),
    apartment: trimStr(body.apartment),
    deliveryNotes: trimStr(body.deliveryNotes),
    isDefault: typeof body.isDefault === 'boolean' ? body.isDefault : undefined,
    speedyOfficeId: trimStr(body.speedyOfficeId),
    speedyOfficeName: trimStr(body.speedyOfficeName),
    speedyOfficeAddress: trimStr(body.speedyOfficeAddress),
  };
}

/**
 * Validate max lengths for all fields. Returns array of errors (empty if valid).
 */
export function validateFieldLengths(
  data: SanitizedBody,
): Array<{ field: string; message: string; code: string }> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (data.firstName && data.firstName.length > MAX_FIRST_NAME) {
    errors.push({
      field: 'firstName',
      message: `Името трябва да е най-много ${MAX_FIRST_NAME} символа`,
      code: 'too_long',
    });
  }

  if (data.lastName && data.lastName.length > MAX_LAST_NAME) {
    errors.push({
      field: 'lastName',
      message: `Фамилията трябва да е най-много ${MAX_LAST_NAME} символа`,
      code: 'too_long',
    });
  }

  if (data.city && data.city.length > MAX_CITY) {
    errors.push({
      field: 'city',
      message: `Градът трябва да е най-много ${MAX_CITY} символа`,
      code: 'too_long',
    });
  }

  if (data.streetAddress && data.streetAddress.length > MAX_STREET) {
    errors.push({
      field: 'streetAddress',
      message: `Адресът трябва да е най-много ${MAX_STREET} символа`,
      code: 'too_long',
    });
  }

  if (data.label && data.label.length > MAX_LABEL) {
    errors.push({
      field: 'label',
      message: `Етикетът трябва да е най-много ${MAX_LABEL} символа`,
      code: 'too_long',
    });
  }

  if (data.buildingEntrance && data.buildingEntrance.length > MAX_OPTIONAL_FIELD) {
    errors.push({
      field: 'buildingEntrance',
      message: `Входът трябва да е най-много ${MAX_OPTIONAL_FIELD} символа`,
      code: 'too_long',
    });
  }

  if (data.floor && data.floor.length > MAX_OPTIONAL_FIELD) {
    errors.push({
      field: 'floor',
      message: `Етажът трябва да е най-много ${MAX_OPTIONAL_FIELD} символа`,
      code: 'too_long',
    });
  }

  if (data.apartment && data.apartment.length > MAX_OPTIONAL_FIELD) {
    errors.push({
      field: 'apartment',
      message: `Апартаментът трябва да е най-много ${MAX_OPTIONAL_FIELD} символа`,
      code: 'too_long',
    });
  }

  if (data.deliveryNotes && data.deliveryNotes.length > MAX_DELIVERY_NOTES) {
    errors.push({
      field: 'deliveryNotes',
      message: `Бележките трябва да са най-много ${MAX_DELIVERY_NOTES} символа`,
      code: 'too_long',
    });
  }

  if (data.speedyOfficeName && data.speedyOfficeName.length > MAX_SPEEDY_OFFICE_NAME) {
    errors.push({
      field: 'speedyOfficeName',
      message: `Името на офиса трябва да е най-много ${MAX_SPEEDY_OFFICE_NAME} символа`,
      code: 'too_long',
    });
  }

  if (data.speedyOfficeAddress && data.speedyOfficeAddress.length > MAX_SPEEDY_OFFICE_ADDRESS) {
    errors.push({
      field: 'speedyOfficeAddress',
      message: `Адресът на офиса трябва да е най-много ${MAX_SPEEDY_OFFICE_ADDRESS} символа`,
      code: 'too_long',
    });
  }

  if (data.speedyOfficeId && data.speedyOfficeId.length > MAX_SPEEDY_OFFICE_ID) {
    errors.push({
      field: 'speedyOfficeId',
      message: `ID на офиса трябва да е най-много ${MAX_SPEEDY_OFFICE_ID} символа`,
      code: 'too_long',
    });
  }

  return errors;
}

/**
 * Auto-generate address label when none provided.
 * @deprecated No longer used for DB persistence. Kept for backwards compatibility
 * if needed elsewhere. Frontend now computes display labels via getAddressDisplayLabel().
 */
export function generateAddressLabel(
  deliveryMethod: string,
  sanitized: SanitizedBody,
): string | null {
  if (sanitized.label) return sanitized.label;

  if (deliveryMethod === 'speedy_office' || deliveryMethod === 'speedy_automat') {
    return (sanitized.speedyOfficeName ?? 'Speedy офис').slice(0, MAX_LABEL);
  }

  const city = sanitized.city ?? '';
  const street = sanitized.streetAddress ?? '';
  if (city && street) {
    return `${city} - ${street}`.slice(0, MAX_LABEL);
  }

  return null;
}

/**
 * If the user profile has no phone, copy the address phone to the profile.
 * Returns true if the phone was synced.
 */
export async function syncPhoneToProfile(userId: string, phone: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('phone')
    .eq('id', userId)
    .single();

  if (profile && !profile.phone?.trim()) {
    await supabaseAdmin
      .from('user_profiles')
      .update({ phone })
      .eq('id', userId);
    return true;
  }
  return false;
}
