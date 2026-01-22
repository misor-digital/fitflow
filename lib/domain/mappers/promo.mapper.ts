/**
 * Promo Code Mapper
 * 
 * Translates database rows to frontend DTOs.
 * - Converts snake_case to camelCase
 * - Parses date strings to Date objects
 * - Normalizes nullable fields
 */

import type { PromoCodeRow } from '../db';
import type { PromoCodeDTO } from '../dto/promo.dto';

/**
 * Map a promo code database row to a DTO
 * 
 * @param row - Promo code database row
 * @returns Promo code DTO
 */
export function mapPromoCode(row: PromoCodeRow): PromoCodeDTO {
  // Parse dates
  const validFrom = row.starts_at ? new Date(row.starts_at) : undefined;
  const validTo = row.ends_at ? new Date(row.ends_at) : undefined;
  
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discount_percent,
    enabled: row.is_enabled,
    validFrom,
    validTo,
    maxUses: row.max_uses ?? undefined,
    currentUses: row.current_uses,
    applicableBoxTypes: row.applicable_box_types ?? undefined,
  };
}
