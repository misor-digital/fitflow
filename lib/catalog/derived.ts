/**
 * Derived State Logic
 * 
 * Pure functions to compute derived state from user input.
 * These functions are used by both client (hooks) and can be tested independently.
 */

import type {
  BoxTypeId,
  UserInput,
  DerivedState,
  PersonalizationStep,
} from './types';
import { EMAIL_REGEX } from './validation';

// ============================================================================
// Box Type Helpers
// ============================================================================

/**
 * Check if a box type is premium (includes clothing)
 */
export function isPremiumBox(boxType: BoxTypeId | null): boolean {
  if (!boxType) return false;
  return boxType.includes('premium');
}

/**
 * Check if a box type is a subscription (recurring)
 */
export function isSubscriptionBox(boxType: BoxTypeId | null): boolean {
  if (!boxType) return false;
  return boxType.startsWith('monthly-');
}

/**
 * Get the display box type for UI selection
 * Normalizes premium variants to 'monthly-premium'
 */
export function getDisplayBoxType(boxType: BoxTypeId | null): string | null {
  if (boxType === 'monthly-premium-monthly' || boxType === 'monthly-premium-seasonal') {
    return 'monthly-premium';
  }
  return boxType;
}

/**
 * Get the premium frequency from a box type
 */
export function getPremiumFrequency(boxType: BoxTypeId | null): 'monthly' | 'seasonal' {
  if (boxType === 'monthly-premium-seasonal') return 'seasonal';
  return 'monthly';
}

/**
 * Build the full box type ID from display type and frequency
 */
export function buildBoxTypeId(
  displayType: string,
  premiumFrequency: 'monthly' | 'seasonal'
): BoxTypeId {
  if (displayType === 'monthly-premium') {
    return `monthly-premium-${premiumFrequency}` as BoxTypeId;
  }
  return displayType as BoxTypeId;
}

// ============================================================================
// Personalization Steps
// ============================================================================

/**
 * Determine which personalization steps are active based on box type and personalization choice
 */
export function getActivePersonalizationSteps(
  wantsPersonalization: boolean | null,
  isPremium: boolean
): PersonalizationStep[] {
  // If personalization choice not made yet, only show that step
  if (wantsPersonalization === null) {
    return ['personalization'];
  }

  if (isPremium) {
    if (wantsPersonalization) {
      return ['personalization', 'sport', 'colors', 'flavors', 'size', 'dietary', 'notes'];
    } else {
      // Premium without personalization still needs sizes for clothing
      return ['personalization', 'size'];
    }
  } else {
    // Standard box
    if (wantsPersonalization) {
      return ['personalization', 'sport', 'flavors', 'dietary', 'notes'];
    } else {
      // Standard without personalization - just the choice
      return ['personalization'];
    }
  }
}

/**
 * Calculate progress percentage for personalization steps
 */
export function calculatePersonalizationProgress(
  currentStepIndex: number,
  totalSteps: number
): number {
  if (totalSteps <= 1) return 100;
  return ((currentStepIndex + 1) / totalSteps) * 100;
}

// ============================================================================
// Requirements
// ============================================================================

/**
 * Check if sizes are required for this box type
 * Premium boxes always need sizes for clothing
 */
export function requiresSizes(boxType: BoxTypeId | null): boolean {
  return isPremiumBox(boxType);
}

/**
 * Check if color preferences are collected
 * Only for premium boxes with personalization
 */
export function requiresColors(
  boxType: BoxTypeId | null,
  wantsPersonalization: boolean | null
): boolean {
  return isPremiumBox(boxType) && wantsPersonalization === true;
}

// ============================================================================
// Full Derived State
// ============================================================================

/**
 * Compute all derived state from user input
 * This is the main function to use in components
 */
export function computeDerivedState(
  input: UserInput,
  currentPersonalizationStep: number = 0
): DerivedState {
  const isPremium = isPremiumBox(input.boxType);
  const isSubscription = isSubscriptionBox(input.boxType);
  const activeSteps = getActivePersonalizationSteps(input.wantsPersonalization, isPremium);
  
  return {
    isPremium,
    isSubscription,
    requiresSizes: requiresSizes(input.boxType),
    requiresColors: requiresColors(input.boxType, input.wantsPersonalization),
    isStep1Valid: validateStep1(input),
    isStep2Valid: validateStep2(input, isPremium),
    isStep3Valid: validateStep3(input),
    isComplete: validateComplete(input, isPremium),
    activePersonalizationSteps: activeSteps,
    personalizationProgress: calculatePersonalizationProgress(
      currentPersonalizationStep,
      activeSteps.length
    ),
  };
}

// ============================================================================
// Step Validation (for derived state)
// ============================================================================

/**
 * Validate Step 1: Box Selection
 */
function validateStep1(input: UserInput): boolean {
  return input.boxType !== null;
}

/**
 * Validate Step 2: Personalization
 */
function validateStep2(input: UserInput, isPremium: boolean): boolean {
  // Must have made personalization choice
  if (input.wantsPersonalization === null) {
    return false;
  }

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
    // If "other" selected, must have text
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
 * Validate Step 3: Contact Info
 */
function validateStep3(input: UserInput): boolean {
  if (!input.fullName.trim()) {
    return false;
  }
  if (!input.email.trim()) {
    return false;
  }
  // Basic email format check
  if (!EMAIL_REGEX.test(input.email)) {
    return false;
  }
  return true;
}

/**
 * Validate all steps
 */
function validateComplete(input: UserInput, isPremium: boolean): boolean {
  return (
    validateStep1(input) &&
    validateStep2(input, isPremium) &&
    validateStep3(input)
  );
}

// ============================================================================
// Utility: Sort with "other" at end
// ============================================================================

/**
 * Sort an array of option IDs, keeping "other" at the end
 * Used when saving to ensure consistent ordering
 */
export function sortWithOtherAtEnd(items: string[]): string[] {
  return [...items].sort((a, b) => {
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    return 0;
  });
}
