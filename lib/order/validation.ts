/**
 * Order Validation Rules
 *
 * Extends catalog validation with address validation for Bulgarian addresses.
 * Used by both client (UI hints) and server (enforcement).
 */

import type { OrderUserInput, AddressInput } from './types';
import type { ValidationResult, ValidationError } from '@/lib/catalog';
import { isPremiumBox, isSubscriptionBox, isValidEmail, isValidPhone } from '@/lib/catalog';

// ============================================================================
// Bulgarian Address Validation
// ============================================================================

/** Bulgarian postal code format: exactly 4 digits */
export const BG_POSTAL_CODE_REGEX = /^\d{4}$/;

/**
 * Validate a Bulgarian postal code
 */
export function isValidPostalCode(code: string): boolean {
  return BG_POSTAL_CODE_REGEX.test(code.trim());
}

/**
 * Validate all required address fields (Bulgarian format)
 */
export function validateAddress(address: AddressInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Full name
  if (!address.fullName.trim()) {
    errors.push({
      field: 'fullName',
      message: 'Името е задължително',
      code: 'required',
    });
  } else if (address.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      message: 'Името трябва да е поне 2 символа',
      code: 'too_short',
    });
  }

  // City
  if (!address.city.trim()) {
    errors.push({
      field: 'city',
      message: 'Градът е задължителен',
      code: 'required',
    });
  } else if (address.city.trim().length < 2) {
    errors.push({
      field: 'city',
      message: 'Градът трябва да е поне 2 символа',
      code: 'too_short',
    });
  }

  // Postal code (BG 4-digit format)
  if (!address.postalCode.trim()) {
    errors.push({
      field: 'postalCode',
      message: 'Пощенският код е задължителен',
      code: 'required',
    });
  } else if (!isValidPostalCode(address.postalCode)) {
    errors.push({
      field: 'postalCode',
      message: 'Пощенският код трябва да е 4 цифри',
      code: 'invalid_format',
    });
  }

  // Street address
  if (!address.streetAddress.trim()) {
    errors.push({
      field: 'streetAddress',
      message: 'Адресът е задължителен',
      code: 'required',
    });
  } else if (address.streetAddress.trim().length < 3) {
    errors.push({
      field: 'streetAddress',
      message: 'Адресът трябва да е поне 3 символа',
      code: 'too_short',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Step Validation
// ============================================================================

/**
 * Validate Step 1: Box Selection
 */
export function validateOrderStep1(input: OrderUserInput): boolean {
  return input.boxType !== null;
}

/**
 * Validate Step 2: Personalization
 * Reuses the same logic as catalog step 2:
 * - Must have made personalization choice
 * - Premium boxes always need sizes
 * - If personalization wanted, validate preference fields
 */
export function validateOrderStep2(input: OrderUserInput): boolean {
  // Must have made personalization choice
  if (input.wantsPersonalization === null) {
    return false;
  }

  const isPremium = isPremiumBox(input.boxType);

  // Premium boxes always need sizes
  if (isPremium) {
    if (!input.sizeUpper || !input.sizeLower) {
      return false;
    }
  }

  // If personalization is wanted, validate those fields
  if (input.wantsPersonalization) {
    // Sports required
    if (input.sports.length === 0) {
      return false;
    }
    if (input.sports.includes('other') && !input.sportOther.trim()) {
      return false;
    }

    // Colors required for premium
    if (isPremium && input.colors.length === 0) {
      return false;
    }

    // Flavors required
    if (input.flavors.length === 0) {
      return false;
    }
    if (input.flavors.includes('other') && !input.flavorOther.trim()) {
      return false;
    }

    // Dietary required
    if (input.dietary.length === 0) {
      return false;
    }
    if (input.dietary.includes('other') && !input.dietaryOther.trim()) {
      return false;
    }
  }

  return true;
}

/**
 * Validate Step 3: Identity & Address
 * - Guest: validate name, email, phone, inline address
 * - Auth with selectedAddressId: valid (address loaded from DB)
 * - Auth without selectedAddressId: validate inline address
 * - Subscription box + guest → always invalid (must be authenticated)
 */
export function validateOrderStep3(input: OrderUserInput): boolean {
  // Subscription boxes require authentication
  if (isSubscriptionBox(input.boxType) && input.isGuest) {
    return false;
  }

  if (input.isGuest) {
    // Guest: validate contact info
    if (!input.fullName.trim() || input.fullName.trim().length < 2) {
      return false;
    }
    if (!input.email.trim() || !isValidEmail(input.email)) {
      return false;
    }
    if (!input.phone.trim() || !isValidPhone(input.phone)) {
      return false;
    }

    // Guest: must have valid inline address
    const addressResult = validateAddress(input.address);
    return addressResult.valid;
  }

  // Authenticated user
  if (input.selectedAddressId) {
    // Using a saved address — valid
    return true;
  }

  // Authenticated without saved address — validate inline address
  const addressResult = validateAddress(input.address);
  return addressResult.valid;
}

// ============================================================================
// Full Order Validation
// ============================================================================

/**
 * Comprehensive validation of all order fields for submission.
 * Returns all errors at once.
 */
export function validateOrderSubmission(input: OrderUserInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Box type required
  if (!input.boxType) {
    errors.push({
      field: 'boxType',
      message: 'Моля, изберете тип кутия',
      code: 'required',
    });
  }

  // Personalization choice required
  if (input.wantsPersonalization === null) {
    errors.push({
      field: 'wantsPersonalization',
      message: 'Моля, изберете дали искате персонализация',
      code: 'required',
    });
  }

  const isPremium = isPremiumBox(input.boxType);

  // Premium boxes require sizes
  if (isPremium) {
    if (!input.sizeUpper) {
      errors.push({
        field: 'sizeUpper',
        message: 'Моля, изберете размер за горна част',
        code: 'required',
      });
    }
    if (!input.sizeLower) {
      errors.push({
        field: 'sizeLower',
        message: 'Моля, изберете размер за долна част',
        code: 'required',
      });
    }
  }

  // Personalization fields
  if (input.wantsPersonalization === true) {
    if (input.sports.length === 0) {
      errors.push({
        field: 'sports',
        message: 'Моля, изберете поне един спорт',
        code: 'required',
      });
    }
    if (input.sports.includes('other') && !input.sportOther.trim()) {
      errors.push({
        field: 'sportOther',
        message: 'Моля, уточнете кой спорт',
        code: 'required',
      });
    }

    if (isPremium && input.colors.length === 0) {
      errors.push({
        field: 'colors',
        message: 'Моля, изберете поне един цвят',
        code: 'required',
      });
    }

    if (input.flavors.length === 0) {
      errors.push({
        field: 'flavors',
        message: 'Моля, изберете поне един вкус',
        code: 'required',
      });
    }
    if (input.flavors.includes('other') && !input.flavorOther.trim()) {
      errors.push({
        field: 'flavorOther',
        message: 'Моля, уточнете кой вкус',
        code: 'required',
      });
    }

    if (input.dietary.length === 0) {
      errors.push({
        field: 'dietary',
        message: 'Моля, изберете хранителни ограничения',
        code: 'required',
      });
    }
    if (input.dietary.includes('other') && !input.dietaryOther.trim()) {
      errors.push({
        field: 'dietaryOther',
        message: 'Моля, уточнете какви ограничения',
        code: 'required',
      });
    }
  }

  // Contact info
  if (!input.fullName.trim()) {
    errors.push({
      field: 'fullName',
      message: 'Името е задължително',
      code: 'required',
    });
  } else if (input.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      message: 'Името трябва да е поне 2 символа',
      code: 'too_short',
    });
  }

  if (!input.email.trim()) {
    errors.push({
      field: 'email',
      message: 'Имейл адресът е задължителен',
      code: 'required',
    });
  } else if (!isValidEmail(input.email)) {
    errors.push({
      field: 'email',
      message: 'Невалиден имейл адрес',
      code: 'invalid_format',
    });
  }

  if (input.phone && !isValidPhone(input.phone)) {
    errors.push({
      field: 'phone',
      message: 'Невалиден телефонен номер',
      code: 'invalid_format',
    });
  }

  // Address validation
  if (!input.selectedAddressId) {
    const addressResult = validateAddress(input.address);
    errors.push(...addressResult.errors.map((e) => ({
      ...e,
      field: `address.${e.field}`,
    })));
  }

  // Subscription box requires authentication
  if (isSubscriptionBox(input.boxType) && input.isGuest) {
    errors.push({
      field: 'isGuest',
      message: 'Абонаментните кутии изискват регистрация',
      code: 'invalid_value',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Per-field Error Getter (for UI)
// ============================================================================

/**
 * Get error message for a specific address field.
 * Returns null if the field is valid.
 */
export function getAddressFieldError(field: string, address: AddressInput): string | null {
  switch (field) {
    case 'fullName':
      if (!address.fullName.trim()) return 'Името е задължително';
      if (address.fullName.trim().length < 2) return 'Името трябва да е поне 2 символа';
      return null;

    case 'city':
      if (!address.city.trim()) return 'Градът е задължителен';
      if (address.city.trim().length < 2) return 'Градът трябва да е поне 2 символа';
      return null;

    case 'postalCode':
      if (!address.postalCode.trim()) return 'Пощенският код е задължителен';
      if (!isValidPostalCode(address.postalCode)) return 'Пощенският код трябва да е 4 цифри';
      return null;

    case 'streetAddress':
      if (!address.streetAddress.trim()) return 'Адресът е задължителен';
      if (address.streetAddress.trim().length < 3) return 'Адресът трябва да е поне 3 символа';
      return null;

    default:
      return null;
  }
}
