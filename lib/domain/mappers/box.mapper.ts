/**
 * Box Type Mapper
 * 
 * Translates database rows to frontend DTOs.
 * - Converts snake_case to camelCase
 * - Calculates derived values (BGN price)
 * - Normalizes nullable fields
 */

import type { BoxTypeRow } from '../db';
import type { BoxTypeDTO } from '../dto/box.dto';

/**
 * EUR to BGN conversion rate
 */
const EUR_TO_BGN_RATE = 1.95583;

/**
 * Map a box type database row to a DTO
 * 
 * @param row - Box type database row
 * @returns Box type DTO
 */
export function mapBoxType(row: BoxTypeRow): BoxTypeDTO {
  // Calculate BGN price
  const priceBGN = Math.round(row.price_eur * EUR_TO_BGN_RATE * 100) / 100;
  
  return {
    id: row.id,
    name: row.name,
    priceEUR: row.price_eur,
    priceBGN,
    subscription: row.is_subscription,
    premium: row.is_premium,
    enabled: row.is_enabled,
    frequency: row.frequency ?? undefined,
    sortOrder: row.sort_order,
  };
}
