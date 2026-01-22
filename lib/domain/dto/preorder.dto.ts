/**
 * Preorder Data Transfer Object
 * 
 * Frontend-friendly representation of a preorder.
 * - camelCase properties
 * - Parsed Date objects
 * - Structured nested objects
 * - Derived values (e.g., BGN price)
 */

export interface PreorderDTO {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Customer's full name
   */
  fullName: string;

  /**
   * Customer's email address
   */
  email: string;

  /**
   * Customer's phone number (optional)
   */
  phone?: string;

  /**
   * When the preorder was created
   */
  createdAt: Date;

  /**
   * Box configuration
   */
  box: {
    /**
     * Subscription plan type
     */
    plan: 'monthly' | 'onetime';

    /**
     * Box tier
     */
    tier: 'standard' | 'premium';

    /**
     * Delivery cadence (only for monthly premium)
     */
    cadence?: 'monthly' | 'seasonal';
  };

  /**
   * Whether customer wants personalization
   */
  wantsPersonalization: boolean;

  /**
   * Selected sports
   */
  sports?: string[];

  /**
   * Selected colors
   */
  colors?: string[];

  /**
   * Selected flavors
   */
  flavors?: string[];

  /**
   * Clothing sizes
   */
  sizes: {
    /**
     * Upper body size
     */
    upper?: string;

    /**
     * Lower body size
     */
    lower?: string;
  };

  /**
   * Dietary preferences
   */
  dietary?: string[];

  /**
   * Pricing information
   */
  price: {
    /**
     * Original price in EUR
     */
    originalEUR: number;

    /**
     * Final price in EUR (after discount)
     */
    finalEUR: number;

    /**
     * Discount percentage applied
     */
    discountPercent: number;

    /**
     * Final price in BGN (derived using rate 1.95583)
     */
    finalBGN: number;
  };

  /**
   * When the preorder was last edited (optional)
   */
  lastEditedAt?: Date;
}
