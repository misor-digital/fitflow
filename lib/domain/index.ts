/**
 * Domain Layer - Main Export Surface
 * 
 * This is the primary entry point for the domain layer.
 * It provides a clean architecture boundary between:
 * 
 * DB Types → Domain Types → DTOs → UI
 * 
 * Usage:
 * ```ts
 * import { PreorderRow, PreorderDTO, mapPreorder } from '@/lib/domain';
 * 
 * const row: PreorderRow = await fetchFromDB();
 * const dto: PreorderDTO = mapPreorder(row);
 * ```
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type {
  // Table Row Types
  PreorderRow,
  BoxTypeRow,
  PromoCodeRow,
  CustomerRow,
  OptionRow,
  NewsletterSubscriptionRow,
  StaffUserRow,
  RoleRow,
  StaffRoleAssignmentRow,
  
  // Table Insert Types
  PreorderInsert,
  BoxTypeInsert,
  PromoCodeInsert,
  CustomerInsert,
  OptionInsert,
  NewsletterSubscriptionInsert,
  StaffUserInsert,
  RoleInsert,
  StaffRoleAssignmentInsert,
  
  // Table Update Types
  PreorderUpdate,
  BoxTypeUpdate,
  PromoCodeUpdate,
  CustomerUpdate,
  OptionUpdate,
  NewsletterSubscriptionUpdate,
  StaffUserUpdate,
  RoleUpdate,
  StaffRoleAssignmentUpdate,
  
  // Enum Types
  BoxType,
  ActorType,
  SubscriptionStatus,
} from './db';

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

export type {
  PreorderDTO,
  BoxTypeDTO,
  PromoCodeDTO,
  CustomerDTO,
} from './dto';

// ============================================================================
// MAPPERS
// ============================================================================

export {
  mapPreorder,
  parseBoxType,
  mapBoxType,
  mapPromoCode,
  mapCustomer,
} from './mappers';
