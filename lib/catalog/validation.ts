/**
 * Validation Rules
 *
 * Centralized validation logic for catalog/order data.
 * Used by both client-side (for UI hints) and server-side (for enforcement).
 */

import type {
  UserInput,
  PersonalizationStep,
  ValidationResult,
  ValidationError,
} from './types';
import { isPremiumBox } from './derived';

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Email validation regex
 * Matches standard email format: local@domain.tld
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Get email validation error message
 */
export function getEmailError(email: string): string | null {
  if (!email.trim()) {
    return 'Имейл адресът е задължителен';
  }
  if (!isValidEmail(email)) {
    return 'Моля, въведете валиден имейл адрес';
  }
  return null;
}

// ============================================================================
// Phone Validation
// ============================================================================

/**
 * Phone validation regex
 * Allows: digits, +, -, (, ), and spaces
 */
export const PHONE_REGEX = /^[0-9+\-() ]*$/;

/**
 * Validate phone format (optional field)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true; // Phone is optional
  return PHONE_REGEX.test(phone);
}

/**
 * Get phone validation error message
 */
export function getPhoneError(phone: string): string | null {
  if (phone && !isValidPhone(phone)) {
    return 'Моля, въведете само цифри и символи за форматиране (+, -, (, ), интервал)';
  }
  return null;
}

// ============================================================================
// Step-by-Step Validation
// ============================================================================

/**
 * Validate a specific personalization step
 * Returns true if the step is valid and user can proceed
 */
export function validatePersonalizationStep(
  step: PersonalizationStep,
  input: UserInput
): boolean {
  switch (step) {
    case 'personalization':
      return input.wantsPersonalization !== null;

    case 'sport':
      if (input.sports.length === 0) return false;
      if (input.sports.includes('other') && !input.sportOther.trim()) return false;
      return true;

    case 'colors':
      return input.colors.length > 0;

    case 'flavors':
      if (input.flavors.length === 0) return false;
      if (input.flavors.includes('other') && !input.flavorOther.trim()) return false;
      return true;

    case 'size':
      return Boolean(input.sizeUpper && input.sizeLower);

    case 'dietary':
      if (input.dietary.length === 0) return false;
      if (input.dietary.includes('other') && !input.dietaryOther.trim()) return false;
      return true;

    case 'notes':
      // Notes are always optional
      return true;

    default:
      return true;
  }
}

// ============================================================================
// Full Submission Validation (Server-side)
// ============================================================================

/**
 * Validate complete submission data
 * Returns detailed validation result with all errors
 */
export function validateSubmission(
  input: UserInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // Required: Box type
  if (!input.boxType) {
    errors.push({
      field: 'boxType',
      message: 'Моля, изберете тип кутия',
      code: 'required',
    });
  }

  // Required: Full name
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

  // Required: Email
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

  // Optional: Phone (but validate format if provided)
  if (input.phone && !isValidPhone(input.phone)) {
    errors.push({
      field: 'phone',
      message: 'Невалиден телефонен номер',
      code: 'invalid_format',
    });
  }

  // Required: Personalization choice
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

  // If personalization is wanted, validate those fields
  if (input.wantsPersonalization === true) {
    // Sports
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

    // Colors (premium only)
    if (isPremium && input.colors.length === 0) {
      errors.push({
        field: 'colors',
        message: 'Моля, изберете поне един цвят',
        code: 'required',
      });
    }

    // Flavors
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

    // Dietary
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get first error for a specific field
 */
export function getFieldError(
  result: ValidationResult,
  field: string
): string | null {
  const error = result.errors.find((e) => e.field === field);
  return error?.message ?? null;
}

/**
 * Check if a specific field has errors
 */
export function hasFieldError(result: ValidationResult, field: string): boolean {
  return result.errors.some((e) => e.field === field);
}
