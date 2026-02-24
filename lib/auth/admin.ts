/**
 * Admin API route helpers
 *
 * Provides a `requireAdmin()` function for API routes that verifies the
 * caller is an authenticated staff member with an admin-level role.
 * Throws `AdminApiError` on auth failures so routes can catch and return
 * the appropriate HTTP response.
 */

import { verifySession, type AuthSession } from './dal';
import { STAFF_MANAGEMENT_ROLES } from './permissions';

// ============================================================================
// Error class
// ============================================================================

export class AdminApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

// ============================================================================
// Auth helper
// ============================================================================

/**
 * Verify the caller is a staff member with an admin-level role.
 *
 * @throws {AdminApiError} with 401 if not authenticated / not staff,
 *   or 403 if the staff role is not in `STAFF_MANAGEMENT_ROLES`.
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await verifySession();

  if (!session || session.profile.user_type !== 'staff') {
    throw new AdminApiError(401, 'Неоторизиран достъп.');
  }

  if (
    !session.profile.staff_role ||
    !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
  ) {
    throw new AdminApiError(403, 'Нямате достъп до тази операция.');
  }

  return session;
}
