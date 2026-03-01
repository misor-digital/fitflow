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
  // Re-exported from catalog / supabase
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
  SubscriptionApiRequest,
  OrderSubmitResponse,

  // Tracking
  OrderTrackingData,

  // Delivery method
  DeliveryMethod,
  SpeedyOfficeSelection,
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

  // Speedy office validation
  validateSpeedyOffice,
} from './validation';

// ============================================================================
// Formatting
// ============================================================================

export {
  // Status labels & colors
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,

  // Timeline constants
  STATUS_ORDER,
  STATUS_BG_COLORS,

  // Status formatting
  formatOrderStatus,
  formatOrderNumber,

  // Address formatting
  formatShippingAddress,
  formatShippingAddressOneLine,

  // Order type labels & colors
  ORDER_TYPE_LABELS,
  ORDER_TYPE_COLORS,

  // Delivery method formatting
  formatDeliveryMethodLabel,
} from './format';

// ============================================================================
// Preorder Formatting
// ============================================================================

export {
  PREORDER_STATUS_LABELS,
  PREORDER_STATUS_COLORS,
} from './preorder-format';

export { getStatusIcon } from './status-icons';

// ============================================================================
// Transformation
// ============================================================================

export {
  // Address transform
  addressInputToSnapshot,

  // Transform functions
  transformOrderToPersistedFormat,
  transformOrderToApiRequest,
  transformOrderToSubscriptionRequest,

  // Initial state
  INITIAL_ORDER_INPUT,
} from './transform';
