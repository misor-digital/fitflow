/**
 * Customer Mapper
 * 
 * Translates database rows to frontend DTOs.
 * - Converts snake_case to camelCase
 * - Parses date strings to Date objects
 * - Normalizes nullable fields
 */

import type { CustomerRow } from '../db';
import type { CustomerDTO } from '../dto/customer.dto';

/**
 * Map a customer database row to a DTO
 * 
 * @param row - Customer database row
 * @returns Customer DTO
 */
export function mapCustomer(row: CustomerRow): CustomerDTO {
  // Parse dates
  const createdAt = new Date(row.created_at);
  
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone ?? undefined,
    preferredLanguage: row.preferred_language ?? undefined,
    marketingConsent: row.marketing_consent,
    createdAt,
  };
}
