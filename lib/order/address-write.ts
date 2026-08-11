/**
 * Address Write Helpers
 *
 * Shared server-side logic for creating and updating addresses across the
 * customer (`/api/address`) and admin (`/api/admin/address`) routes.
 *
 * Pure module — no DB access, so it stays test- and client-friendly.
 * DB-touching helpers (e.g. syncPhoneToProfile) live in `@/lib/data`.
 */

import { validateAddress, validateSpeedyOffice } from './validation';
import type { SpeedyOfficeSelection } from './types';
import { isValidPhone } from '@/lib/catalog';
import type { ValidationError } from '@/lib/catalog';
import type { AddressInsert, AddressUpdate } from '@/lib/supabase/types';

// ============================================================================
// Constants
// ============================================================================

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

/** Maximum addresses allowed per user. */
export const MAX_ADDRESSES = 10;

export const VALID_DELIVERY_METHODS = [
  'address',
  'speedy_office',
  'speedy_automat',
] as const;
export type DeliveryMethodValue = (typeof VALID_DELIVERY_METHODS)[number];

/** True for delivery methods that use a Speedy pickup point (office or automat). */
export function isSpeedyPickup(method: DeliveryMethodValue): boolean {
  return method === 'speedy_office' || method === 'speedy_automat';
}

// ============================================================================
// Sanitization
// ============================================================================

export interface SanitizedBody {
  deliveryMethod: DeliveryMethodValue;
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
 * Trim all string fields from the request body and resolve the delivery method.
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

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate max lengths for all fields. Returns array of errors (empty if valid).
 */
export function validateFieldLengths(data: SanitizedBody): ValidationError[] {
  const errors: ValidationError[] = [];

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
 * Validate the phone number (required for all delivery methods).
 * Returns array of errors (empty if valid).
 */
export function validatePhone(phone: string | undefined): ValidationError[] {
  if (!phone?.trim()) {
    return [
      { field: 'phone', message: 'Телефонният номер е задължителен', code: 'required' },
    ];
  }
  if (!isValidPhone(phone)) {
    return [
      {
        field: 'phone',
        message:
          'Моля, въведете само цифри и символи за форматиране (+, -, (, ), интервал)',
        code: 'invalid_format',
      },
    ];
  }
  return [];
}

/**
 * Run domain validation for the resolved delivery method.
 * Handles the address vs Speedy pickup (office/automat) branch in one place.
 */
export function validateAddressDomain(
  sanitized: SanitizedBody,
): { valid: boolean; errors: ValidationError[] } {
  if (isSpeedyPickup(sanitized.deliveryMethod)) {
    const officeSelection: SpeedyOfficeSelection | null =
      sanitized.speedyOfficeId && sanitized.speedyOfficeName
        ? {
            id: sanitized.speedyOfficeId,
            name: sanitized.speedyOfficeName,
            address: sanitized.speedyOfficeAddress ?? '',
          }
        : null;

    return validateSpeedyOffice(
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
  }

  return validateAddress({
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
}

// ============================================================================
// Persistence payload
// ============================================================================

/**
 * Auto-generate an address label when none provided.
 */
export function generateAddressLabel(sanitized: SanitizedBody): string | null {
  if (sanitized.label) return sanitized.label;

  if (isSpeedyPickup(sanitized.deliveryMethod)) {
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
 * Build the DB insert payload for the resolved delivery method.
 */
export function buildAddressInsert(
  userId: string,
  sanitized: SanitizedBody,
): AddressInsert {
  const label = generateAddressLabel(sanitized);

  if (isSpeedyPickup(sanitized.deliveryMethod)) {
    return {
      user_id: userId,
      delivery_method: sanitized.deliveryMethod,
      first_name: sanitized.firstName!,
      last_name: sanitized.lastName!,
      phone: sanitized.phone || null,
      speedy_office_id: sanitized.speedyOfficeId!,
      speedy_office_name: sanitized.speedyOfficeName!,
      speedy_office_address: sanitized.speedyOfficeAddress || null,
      label,
      delivery_notes: sanitized.deliveryNotes || null,
      is_default: sanitized.isDefault ?? false,
    };
  }

  return {
    user_id: userId,
    delivery_method: 'address',
    first_name: sanitized.firstName!,
    last_name: sanitized.lastName!,
    city: sanitized.city!,
    postal_code: sanitized.postalCode!,
    street_address: sanitized.streetAddress!,
    label,
    phone: sanitized.phone || null,
    building_entrance: sanitized.buildingEntrance || null,
    floor: sanitized.floor || null,
    apartment: sanitized.apartment || null,
    delivery_notes: sanitized.deliveryNotes || null,
    is_default: sanitized.isDefault ?? false,
  };
}

/**
 * Build the DB update payload for the resolved delivery method.
 * When switching method, explicitly nulls out fields that no longer apply.
 */
export function buildAddressUpdate(sanitized: SanitizedBody): AddressUpdate {
  if (isSpeedyPickup(sanitized.deliveryMethod)) {
    return {
      delivery_method: sanitized.deliveryMethod,
      first_name: sanitized.firstName!,
      last_name: sanitized.lastName!,
      phone: sanitized.phone || null,
      speedy_office_id: sanitized.speedyOfficeId!,
      speedy_office_name: sanitized.speedyOfficeName!,
      speedy_office_address: sanitized.speedyOfficeAddress || null,
      label: sanitized.label || null,
      delivery_notes: sanitized.deliveryNotes || null,
      is_default: sanitized.isDefault ?? false,
      // Null out home-delivery fields
      city: null,
      postal_code: null,
      street_address: null,
      building_entrance: null,
      floor: null,
      apartment: null,
    };
  }

  return {
    delivery_method: 'address',
    first_name: sanitized.firstName!,
    last_name: sanitized.lastName!,
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
    // Null out Speedy fields
    speedy_office_id: null,
    speedy_office_name: null,
    speedy_office_address: null,
  };
}
