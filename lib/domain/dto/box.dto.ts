/**
 * Box Type Data Transfer Object
 * 
 * Frontend-friendly representation of a box type.
 * - camelCase properties
 * - Derived BGN price
 * - Simplified boolean flags
 */

export interface BoxTypeDTO {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Box type name
   */
  name: string;

  /**
   * Price in EUR
   */
  priceEUR: number;

  /**
   * Price in BGN (derived using rate 1.95583)
   */
  priceBGN: number;

  /**
   * Whether this is a subscription box
   */
  subscription: boolean;

  /**
   * Whether this is a premium box
   */
  premium: boolean;

  /**
   * Whether this box type is enabled
   */
  enabled: boolean;

  /**
   * Delivery frequency (e.g., "monthly", "seasonal")
   */
  frequency?: string;

  /**
   * Sort order for display
   */
  sortOrder: number;
}
