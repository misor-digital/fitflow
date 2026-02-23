/**
 * Preorder Domain Module
 * 
 * Centralized exports for all preorder-related types, utilities, and logic.
 * Import from '@/lib/preorder' instead of individual files.
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
  PreorderUserInput,
  
  // Derived state
  PersonalizationStep,
  PreorderDerivedState,
  
  // Persistence
  PreorderPersistData,
  
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
  PreorderSubmitResponse,
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
  validatePreorderSubmission,
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
// Labels (DEPRECATED - use lib/data/catalog.ts to fetch from database)
// ============================================================================

// NOTE: Label maps have been removed. Fetch labels from the database using:
// - getBoxTypeNames() from lib/data/catalog.ts
// - getOptionLabels('sports') from lib/data/catalog.ts
// - getColorNames() from lib/data/catalog.ts
// etc.
//
// For email templates, use formatOptionsWithOther from lib/email/templates.ts

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
  type PreorderApiRequest,
} from './transform';
