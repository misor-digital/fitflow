/**
 * Preorder Mapper
 * 
 * Translates database rows to frontend DTOs.
 * - Converts snake_case to camelCase
 * - Parses date strings to Date objects
 * - Structures nested objects
 * - Calculates derived values
 */

import type { PreorderRow, BoxType } from '../db';
import type { PreorderDTO } from '../dto/preorder.dto';

/**
 * EUR to BGN conversion rate
 */
const EUR_TO_BGN_RATE = 1.95583;

/**
 * Parse box type string into structured object
 * 
 * @param boxType - Box type enum value
 * @returns Structured box configuration
 * 
 * @example
 * parseBoxType('monthly-premium-seasonal')
 * // Returns: { plan: 'monthly', tier: 'premium', cadence: 'seasonal' }
 */
export function parseBoxType(boxType: BoxType): PreorderDTO['box'] {
  const parts = boxType.split('-');
  
  const plan = parts[0] as 'monthly' | 'onetime';
  const tier = parts[1] as 'standard' | 'premium';
  
  // Extract cadence if present (only for monthly premium)
  let cadence: 'monthly' | 'seasonal' | undefined;
  if (parts.length > 2) {
    cadence = parts[2] as 'monthly' | 'seasonal';
  }
  
  return {
    plan,
    tier,
    ...(cadence && { cadence }),
  };
}

/**
 * Map a preorder database row to a DTO
 * 
 * @param row - Preorder database row
 * @returns Preorder DTO
 */
export function mapPreorder(row: PreorderRow): PreorderDTO {
  // Parse dates
  const createdAt = new Date(row.created_at);
  const lastEditedAt = row.last_edited_at ? new Date(row.last_edited_at) : undefined;
  
  // Parse box type
  const box = parseBoxType(row.box_type);
  
  // Calculate prices
  const originalEUR = row.original_price_eur ?? 0;
  const finalEUR = row.final_price_eur ?? originalEUR;
  const discountPercent = row.discount_percent ?? 0;
  const finalBGN = Math.round(finalEUR * EUR_TO_BGN_RATE * 100) / 100;
  
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    createdAt,
    box,
    wantsPersonalization: row.wants_personalization,
    sports: row.sports ?? undefined,
    colors: row.colors ?? undefined,
    flavors: row.flavors ?? undefined,
    sizes: {
      upper: row.size_upper ?? undefined,
      lower: row.size_lower ?? undefined,
    },
    dietary: row.dietary ?? undefined,
    price: {
      originalEUR,
      finalEUR,
      discountPercent,
      finalBGN,
    },
    lastEditedAt,
  };
}
