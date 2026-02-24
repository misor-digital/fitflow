/**
 * Catalog Domain Module
 *
 * Shared types, validation, formatting, and derived-state logic
 * for box types, personalization, and pricing.
 *
 * Import from '@/lib/catalog' instead of individual files.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Box types
  BoxTypeId,
  BoxType,
  PremiumFrequency,
  
  // Price information
  PriceInfo,
  PriceDisplayInfo,
  PricesMap,
  
  // User input
  UserInput,
  
  // Derived state
  PersonalizationStep,
  DerivedState,
  
  // Persistence
  PersistData,
  
  // Catalog
  CatalogOption,
  ColorOption,
  CatalogData,
  
  // Validation
  ValidationError,
  ValidationResult,
  
  // API responses
  PricesApiResponse,
  CatalogApiResponse,
  PromoValidationResponse,
  SubmitResponse,
} from './types';

// ============================================================================
// Derived State Logic
// ============================================================================

export {
  // Box type helpers
  isPremiumBox,
  isSubscriptionBox,
  getDisplayBoxType,
  getPremiumFrequency,
  buildBoxTypeId,
  
  // Personalization steps
  getActivePersonalizationSteps,
  calculatePersonalizationProgress,
  
  // Requirements
  requiresSizes,
  requiresColors,
  
  // Full derived state
  computeDerivedState,
  
  // Utilities
  sortWithOtherAtEnd,
} from './derived';

// ============================================================================
// Validation
// ============================================================================

export {
  // Regex patterns
  EMAIL_REGEX,
  PHONE_REGEX,
  
  // Validation functions
  isValidEmail,
  isValidPhone,
  
  // Error messages
  getEmailError,
  getPhoneError,
  
  // Step validation
  validatePersonalizationStep,
  
  // Full validation
  validateSubmission,
  getFieldError,
  hasFieldError,
} from './validation';

// ============================================================================
// Formatting
// ============================================================================

export {
  // Price formatting
  formatPrice,
  formatPriceBgn,
  formatPriceEur,
  formatPriceDual,
  formatDiscount,
  formatSavings,
  
  // Currency conversion
  eurToBgnSync,
  bgnToEurSync,
  
  // Discount calculation
  calculateDiscountAmount,
  calculateFinalPrice,
} from './format';

// ============================================================================
// Transformation
// ============================================================================

export {
  // Transform functions
  transformToPersistedFormat,
  transformToApiRequest,
  
  // Initial state
  INITIAL_USER_INPUT,
  
  // Utilities
  extractUserInput,
  
  // Types
  type ApiRequest,
} from './transform';
