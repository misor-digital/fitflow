# Internal Tools Authentication

This document describes the authentication and authorization system for FitFlow internal tools.

## Overview

Internal tools (`/internal/*`) are protected by Supabase Auth. Only authenticated admin users can access these tools.

## How Admins Log In

1. Navigate to `/login`
2. Enter email and password
3. On successful login, you'll be redirected to `/internal`

## User Types and Roles

### User Types
- `admin` - Internal team members (QA, ops, marketing)
- `client` - Customer accounts (future)

### Admin Roles
- `admin` - Full access to all internal tools
- `ops` - Operations team (future role restrictions)
- `marketing` - Marketing team (future role restrictions)

## How to Add New Admins

### Option 1: Using the Seed Script

Add the email to `scripts/seed-admins.ts`:

```typescript
const ADMIN_USERS = [
  { email: 'development@fitflow.bg', role: 'admin' },
  { email: 'admin@fitflow.bg', role: 'admin' },
  { email: 'newadmin@fitflow.bg', role: 'admin' }, // Add new admin
];
```

Then run:
```bash
npx tsx scripts/seed-admins.ts
```

### Option 2: Manual via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite user" and enter the email
3. After user is created, add their profile:

```sql
INSERT INTO user_profiles (id, email, name, user_type, role, is_active)
VALUES (
  'user-uuid-from-auth',
  'newadmin@fitflow.bg',
  'New Admin',
  'admin',
  'admin',
  true
);
```

## How to Audit Actions

All critical admin actions are logged to the `audit_log` table.

### Logged Actions
- `campaign.create` - Campaign created
- `campaign.update` - Campaign updated
- `campaign.start` - Campaign started
- `campaign.pause` - Campaign paused
- `campaign.resume` - Campaign resumed
- `campaign.cancel` - Campaign cancelled
- `follow_up.create` - Follow-up campaign created

### Viewing Audit Logs

```sql
-- Recent audit logs
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;

-- Logs for a specific campaign
SELECT * FROM audit_log 
WHERE entity_type = 'campaign' AND entity_id = 'campaign-uuid'
ORDER BY created_at DESC;

-- Logs by a specific user
SELECT * FROM audit_log 
WHERE user_email = 'admin@fitflow.bg'
ORDER BY created_at DESC;
```

## Route Protection

### Protected Routes
- `/internal/*` - All internal pages (requires admin)
- `/api/marketing/*` - All marketing APIs (requires admin)

### Unprotected Routes
- `/login` - Public login page
- `/api/marketing/unsubscribe` - Public unsubscribe endpoint
- `/api/marketing/runner` - Protected by `MARKETING_RUNNER_SECRET`

## Rollout Plan

### Step 1: Deploy Migrations
```bash
# Run migrations to create tables AND seed admin users
supabase db push
```

This runs two migrations:
1. `20260108000000_add_auth_tables.sql` - Creates `user_profiles` and `audit_log` tables
2. `20260108000001_seed_admin_users.sql` - Seeds admin users in `auth.users` and `user_profiles`

### Step 2: Admins Set Passwords
Admin users are created with placeholder passwords. To set real passwords:

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Find the admin user
3. Click "Send password reset email"

**Option B: Via SQL (for local development)**
```sql
-- Update password directly (only for local dev!)
UPDATE auth.users 
SET encrypted_password = crypt('your-password', gen_salt('bf'))
WHERE email = 'development@fitflow.bg';
```

### Step 4: Verify Login
- Test login at `/login`
- Verify access to `/internal`

### Step 5: Deploy Auth Code
- Deploy the updated code with auth enforcement
- Internal tools now require authentication

## Rollback Plan

If authentication causes issues in production:

### Quick Rollback (Temporary)

Re-add environment check to `app/internal/layout.tsx`:

```typescript
import { isInternalEnvironment } from '@/lib/internal';
import { notFound } from 'next/navigation';

export default async function InternalLayout({ children }) {
  // TEMPORARY ROLLBACK: Re-enable environment gating
  if (!isInternalEnvironment()) {
    notFound();
  }
  
  // ... rest of layout
}
```

### Full Rollback

1. Revert the auth-related commits
2. Restore `lib/internal/environment.ts` and `lib/internal/index.ts`
3. Restore environment checks in API routes

### Database Rollback

The `user_profiles` and `audit_log` tables can remain - they don't affect functionality if auth is disabled.

## Environment Variables

Required for authentication:

```env
# Public (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side (for admin operations)
SUPABASE_SECRET_KEY=your-service-role-key
```

## Security Notes

1. **No public registration** - Users can only be added by admins
2. **Server-side enforcement** - Auth is checked on the server, not just client
3. **Audit trail** - All admin actions are logged
4. **Role-based access** - Future support for granular permissions
5. **Session management** - Uses Supabase Auth cookies (httpOnly, secure)
