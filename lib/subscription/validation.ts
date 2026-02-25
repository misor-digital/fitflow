/**
 * Subscription Validation Rules
 *
 * Validation functions for subscription operations.
 * Reuses personalization validation logic from catalog domain.
 */

import type { SubscriptionPreferencesUpdate } from './types';
import type { BoxTypeId } from '@/lib/catalog';
import { isPremiumBox } from '@/lib/catalog';

// ============================================================================
// Preference Validation
// ============================================================================

/**
 * Validate a preferences update for a subscription.
 *
 * - Premium boxes require sizes when personalization is wanted.
 * - At least one sport required when personalization is wanted.
 * - Flavors and dietary are required when personalization is wanted.
 */
export function validatePreferenceUpdate(
  prefs: SubscriptionPreferencesUpdate,
  boxType: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isPremium = isPremiumBox(boxType as BoxTypeId);

  if (prefs.wants_personalization) {
    // Sports required
    if (!prefs.sports || prefs.sports.length === 0) {
      errors.push('Моля, изберете поне един спорт');
    }
    if (prefs.sports?.includes('other') && !prefs.sport_other?.trim()) {
      errors.push('Моля, уточнете кой спорт');
    }

    // Sizes required for premium
    if (isPremium) {
      if (!prefs.size_upper) {
        errors.push('Моля, изберете размер за горна част');
      }
      if (!prefs.size_lower) {
        errors.push('Моля, изберете размер за долна част');
      }
    }

    // Colors required for premium
    if (isPremium && (!prefs.colors || prefs.colors.length === 0)) {
      errors.push('Моля, изберете поне един цвят');
    }

    // Flavors required
    if (!prefs.flavors || prefs.flavors.length === 0) {
      errors.push('Моля, изберете поне един вкус');
    }
    if (prefs.flavors?.includes('other') && !prefs.flavor_other?.trim()) {
      errors.push('Моля, уточнете кой вкус');
    }

    // Dietary required
    if (!prefs.dietary || prefs.dietary.length === 0) {
      errors.push('Моля, изберете хранителни ограничения');
    }
    if (prefs.dietary?.includes('other') && !prefs.dietary_other?.trim()) {
      errors.push('Моля, уточнете какви ограничения');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Frequency Validation
// ============================================================================

const VALID_FREQUENCIES = ['monthly', 'seasonal'] as const;

/**
 * Validate a frequency change request.
 */
export function validateFrequencyChange(
  currentFrequency: string,
  newFrequency: string,
): { valid: boolean; error?: string } {
  if (currentFrequency === newFrequency) {
    return { valid: false, error: 'Новата честота е същата като текущата' };
  }

  if (!(VALID_FREQUENCIES as readonly string[]).includes(newFrequency)) {
    return { valid: false, error: 'Невалидна честота на доставка' };
  }

  return { valid: true };
}

// ============================================================================
// Cancellation Validation
// ============================================================================

/**
 * Validate a cancellation reason.
 * Must be non-empty and at most 1000 characters.
 */
export function validateCancellationReason(reason: string): boolean {
  const trimmed = reason.trim();
  return trimmed.length > 0 && trimmed.length <= 1000;
}
