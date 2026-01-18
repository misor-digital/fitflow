# Middleware Refactor: Remove Service Role DB Access

## Problem

The middleware was using the Supabase service role key (`SUPABASE_SECRET_KEY`) to query the `user_roles` table directly, bypassing Row Level Security (RLS). This is problematic because:

1. **Security Risk**: Service role keys should never be used in middleware or edge runtime contexts
2. **Scalability**: Doesn't support future expansion to regular client users with different roles
3. **Best Practice Violation**: Middleware should use session-based authentication, not admin credentials

## Solution

Refactored the authentication flow to use RLS policies instead of service role access:

### 1. Database Changes

**Migration**: `supabase/migrations/20260118000000_add_user_roles_rls_policy.sql`

Added an RLS policy allowing authenticated users to read their own roles:

```sql
CREATE POLICY "Allow users to read their own roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

This allows:
- ✅ Users can read their own role assignments
- ❌ Users cannot modify roles (INSERT/UPDATE/DELETE remain service-role only)
- ❌ Users cannot read other users' roles

### 2. Code Changes

#### middleware.ts
- **Before**: Used `SUPABASE_SECRET_KEY` with `adminClient` to bypass RLS
- **After**: Uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with session cookies to query roles via RLS

```typescript
// Before
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, // ❌ Service role
  { cookies: { ... } }
);

// After
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, // Publishable key + session
  { cookies: { ... } }
);
```

#### lib/auth/server.ts
- **Before**: Used `adminClient` to fetch user roles
- **After**: Uses session-based client with RLS policy

```typescript
// Before
const { data, error } = await adminClient
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

// After
const supabase = await createClient();
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);
```

#### lib/supabase/adminClient.ts (NEW)
Created a dedicated admin client file with clear security warnings:

```typescript
/**
 * ⚠️ SECURITY WARNING:
 * - Only use this in server-side code (API routes, server actions, server components)
 * - Never use in middleware or edge runtime
 * - Never expose to client-side code
 */
export const adminClient: SupabaseClient<Database> = createClient(...);
```

#### lib/supabase/client.ts
- **Before**: Exported service role client directly
- **After**: Re-exports `adminClient` with deprecation notice for backward compatibility

### 3. Legitimate Service Role Usage

The following files still use `adminClient` (service role) legitimately:

- **lib/audit/logger.ts**: System-level audit logging (bypasses RLS by design)
- **lib/data/catalog.ts**: Public catalog data (no auth required, uses service role for simplicity)
- **lib/data/promo.ts**: Promo code validation and usage tracking (system operations)

These are all server-side only and never run in middleware or client code.

## Benefits

1. **Security**: No service role keys in middleware/edge runtime
2. **Scalability**: Ready for multi-role user system (admin, ops, marketing, customer)
3. **Least Privilege**: Users can only read their own roles, not modify them
4. **Consistency**: Same authorization pattern across middleware and server components
5. **Future-Proof**: Easy to extend with more granular role-based access control

## Migration Steps

To apply this refactor:

1. **Run the migration**:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or manually in Supabase SQL Editor
   # Run: supabase/migrations/20260118000000_add_user_roles_rls_policy.sql
   ```

2. **Deploy code changes**:
   - All changes are backward compatible
   - No environment variable changes needed
   - Existing admin users continue to work

3. **Verify**:
   - Test login as admin user
   - Verify `/internal/*` and `/api/marketing/*` routes are protected
   - Check that non-admin users get 403 errors

## Testing

### Manual Testing

1. **Admin user can access protected routes**:
   - Login as admin
   - Navigate to `/internal`
   - Should see internal dashboard

2. **Non-admin user gets 403**:
   - Create user without admin role
   - Try to access `/internal`
   - Should get "Admin role required" error

3. **Unauthenticated user redirected to login**:
   - Logout
   - Try to access `/internal`
   - Should redirect to `/login?redirect=/internal`

### Automated Testing (Future)

Consider adding integration tests:
- Middleware role checks
- RLS policy enforcement
- Session-based authentication flow

## Rollback

If issues arise, rollback is simple:

1. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   ```

2. **Database migration remains**:
   - The RLS policy is harmless and can stay
   - Or drop it: `DROP POLICY "Allow users to read their own roles" ON user_roles;`

## Future Enhancements

This refactor enables:

1. **Role-based routing**: Different roles for different route groups
   - `/internal/marketing/*` → `marketing | admin`
   - `/internal/ops/*` → `ops | admin`
   - `/account/*` → any authenticated user

2. **Client user roles**: Add `customer`, `coach`, etc. for client-facing features

3. **Fine-grained permissions**: Per-feature authorization checks

---

**Date**: January 18, 2026  
**Author**: Senior Principal Engineer  
**Status**: ✅ Completed
