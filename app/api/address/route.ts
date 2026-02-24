import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getAddressesByUser,
  createAddress,
  countAddressesByUser,
} from '@/lib/data';
import { validateAddress } from '@/lib/order';
import { isValidPhone } from '@/lib/preorder';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import type { AddressInsert } from '@/lib/supabase/types';

// Field length limits
const MAX_FULL_NAME = 200;
const MAX_CITY = 100;
const MAX_STREET = 500;
const MAX_LABEL = 50;
const MAX_OPTIONAL_FIELD = 50; // buildingEntrance, floor, apartment
const MAX_DELIVERY_NOTES = 500;
const MAX_ADDRESSES = 10;

/** Rate limit: 20 requests per minute */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60;

// ============================================================================
// GET /api/address — List current user's addresses
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
// POST /api/address — Create a new address
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

    // Sanitize — trim all string fields
    const sanitized = sanitizeAddressBody(body);

    // Server-side length validation
    const lengthErrors = validateFieldLengths(sanitized);
    if (lengthErrors.length > 0) {
      return NextResponse.json(
        { error: 'Невалидни данни', details: lengthErrors },
        { status: 400 },
      );
    }

    // Phone format validation (optional field)
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

    // Domain validation (required fields, postal code format, etc.)
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

    // Build insert payload
    const insertData: AddressInsert = {
      user_id: session.userId,
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

interface SanitizedBody {
  label?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  streetAddress?: string;
  buildingEntrance?: string;
  floor?: string;
  apartment?: string;
  deliveryNotes?: string;
  isDefault?: boolean;
}

/**
 * Trim all string fields from the request body.
 */
function sanitizeAddressBody(body: Record<string, unknown>): SanitizedBody {
  const trimStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v.trim() : undefined;

  return {
    label: trimStr(body.label),
    fullName: trimStr(body.fullName),
    phone: trimStr(body.phone),
    city: trimStr(body.city),
    postalCode: trimStr(body.postalCode),
    streetAddress: trimStr(body.streetAddress),
    buildingEntrance: trimStr(body.buildingEntrance),
    floor: trimStr(body.floor),
    apartment: trimStr(body.apartment),
    deliveryNotes: trimStr(body.deliveryNotes),
    isDefault: typeof body.isDefault === 'boolean' ? body.isDefault : undefined,
  };
}

/**
 * Validate max lengths for all fields. Returns array of errors (empty if valid).
 */
export function validateFieldLengths(
  data: SanitizedBody,
): Array<{ field: string; message: string; code: string }> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (data.fullName && data.fullName.length > MAX_FULL_NAME) {
    errors.push({
      field: 'fullName',
      message: `Името трябва да е най-много ${MAX_FULL_NAME} символа`,
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

  return errors;
}
