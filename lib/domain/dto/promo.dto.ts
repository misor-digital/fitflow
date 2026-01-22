/**
 * Promo Code Data Transfer Object
 * 
 * Frontend-friendly representation of a promo code.
 * - camelCase properties
 * - Parsed Date objects
 * - Simplified structure
 */

export interface PromoCodeDTO {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Promo code string
   */
  code: string;

  /**
   * Discount percentage (0-100)
   */
  discountPercent: number;

  /**
   * Whether this promo code is enabled
   */
  enabled: boolean;

  /**
   * Valid from date (optional)
   */
  validFrom?: Date;

  /**
   * Valid to date (optional)
   */
  validTo?: Date;

  /**
   * Maximum number of uses (optional)
   */
  maxUses?: number;

  /**
   * Current number of uses
   */
  currentUses: number;

  /**
   * Box types this promo code applies to
   */
  applicableBoxTypes?: string[];
}
