/**
 * Order-to-Subscription Conversion Input Validation
 *
 * Validates user-provided form data for the conversion flow:
 * frequency, delivery address, and optional personalization preferences.
 */

import { validatePreferenceUpdate } from './validation';

// ============================================================================
// Types
// ============================================================================

interface InlineAddress {
  city: string;
  postalCode: string;
  streetAddress: string;
}

export interface ConversionInput {
  frequency: string;
  addressId?: string;
  inlineAddress?: InlineAddress;
  deliveryMethod: string;
  speedyOfficeId?: string;
  speedyOfficeName?: string;
  speedyOfficeAddress?: string;
  wantsPersonalization?: boolean;
  sports?: string[];
  colors?: string[];
  flavors?: string[];
  dietary?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const VALID_FREQUENCIES = ['monthly', 'seasonal'] as const;
const BG_POSTAL_CODE_REGEX = /^\d{4}$/;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate user-provided conversion form data.
 *
 * Checks frequency, delivery method / address fields, and delegates
 * personalization validation to `validatePreferenceUpdate()` when applicable.
 */
export function validateConversionInput(
  input: ConversionInput,
  boxType: string = 'monthly-standard',
): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // 1. Frequency
  if (!(VALID_FREQUENCIES as readonly string[]).includes(input.frequency)) {
    errors.push('Невалидна честота на доставка');
  }

  // 2. Delivery method: speedy_office
  if (input.deliveryMethod === 'speedy_office') {
    if (!input.speedyOfficeId?.trim()) {
      errors.push('Моля, изберете офис на Спиди');
    }
    if (!input.speedyOfficeName?.trim()) {
      errors.push('Името на офиса на Спиди е задължително');
    }
    if (!input.speedyOfficeAddress?.trim()) {
      errors.push('Адресът на офиса на Спиди е задължителен');
    }
  } else {
    // 3. Delivery method: address (default)
    if (!input.addressId && !input.inlineAddress) {
      errors.push('Моля, изберете или въведете адрес за доставка');
    }

    // 4. Inline address validation
    if (input.inlineAddress) {
      if (!input.inlineAddress.city.trim()) {
        errors.push('Градът е задължителен');
      }
      if (!input.inlineAddress.streetAddress.trim()) {
        errors.push('Адресът е задължителен');
      }
      if (!input.inlineAddress.postalCode.trim()) {
        errors.push('Пощенският код е задължителен');
      } else if (!BG_POSTAL_CODE_REGEX.test(input.inlineAddress.postalCode.trim())) {
        errors.push('Пощенският код трябва да е 4 цифри');
      }
    }
  }

  // 5. Personalization preferences
  if (input.wantsPersonalization) {
    const prefResult = validatePreferenceUpdate(
      {
        wants_personalization: true,
        sports: input.sports ?? null,
        colors: input.colors ?? null,
        flavors: input.flavors ?? null,
        dietary: input.dietary ?? null,
      },
      boxType,
    );
    if (!prefResult.valid) {
      errors.push(...prefResult.errors);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
