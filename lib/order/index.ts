/**
 * Order Domain Module
 *
 * Centralized exports for all order-related types, utilities, and logic.
 * Import from '@/lib/order' instead of individual files.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Re-exported from preorder / supabase
  BoxTypeId,
  PriceInfo,
  PriceDisplayInfo,
  PricesMap,
  OrderStatus,
  ShippingAddressSnapshot,

  // Address
  AddressInput,

  // User input
  OrderUserInput,

  // Derived state
  OrderStep,
  OrderDerivedState,

  // Persistence
  OrderPersistData,

  // API
  OrderApiRequest,
  OrderSubmitResponse,

  // Tracking
  OrderTrackingData,
} from './types';

// ============================================================================
// Derived State
// ============================================================================

export {
  // Auth requirements
  requiresAuth,
  canCheckoutAsGuest,

  // Full derived state
  computeOrderDerivedState,
} from './derived';

// ============================================================================
// Validation
// ============================================================================

export {
  // Regex patterns
  BG_POSTAL_CODE_REGEX,

  // Validation functions
  isValidPostalCode,
  validateAddress,

  // Step validation
  validateOrderStep1,
  validateOrderStep2,
  validateOrderStep3,

  // Full validation
  validateOrderSubmission,

  // Per-field error
  getAddressFieldError,
} from './validation';

// ============================================================================
// Formatting
// ============================================================================

export {
  // Status labels & colors
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,

  // Status formatting
  formatOrderStatus,
  formatOrderNumber,

  // Address formatting
  formatShippingAddress,
  formatShippingAddressOneLine,
} from './format';

// ============================================================================
// Transformation
// ============================================================================

export {
  // Address transform
  addressInputToSnapshot,

  // Transform functions
  transformOrderToPersistedFormat,
  transformOrderToApiRequest,

  // Initial state
  INITIAL_ORDER_INPUT,
} from './transform';
