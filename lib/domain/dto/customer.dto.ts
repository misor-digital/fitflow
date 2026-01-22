/**
 * Customer Data Transfer Object
 * 
 * Frontend-friendly representation of a customer.
 * - camelCase properties
 * - Parsed Date objects
 * - Simplified structure
 */

export interface CustomerDTO {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Customer's full name
   */
  fullName: string;

  /**
   * Customer's phone number (optional)
   */
  phone?: string;

  /**
   * Preferred language (e.g., "en", "bg")
   */
  preferredLanguage?: string;

  /**
   * Whether customer has consented to marketing communications
   */
  marketingConsent: boolean;

  /**
   * When the customer record was created
   */
  createdAt: Date;
}
