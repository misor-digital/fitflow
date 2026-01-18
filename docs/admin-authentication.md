## Admin Authentication System

Complete authentication and authorization system for FitFlow internal tools.

## Overview

The admin authentication system provides secure access control for internal marketing and operations tools. It replaces environment-based gating with proper authentication and role-based authorization.

**Key Features:**
- Email/password authentication via Supabase Auth
- Role-based authorization (admin, ops, marketing)
- Email verification requirement
- Secure password requirements
- Audit logging for all critical actions
- Works in ALL environments (including production)

---

## Getting Started

### 1. Run Database Migration

First, apply the authentication and audit logging migration:

```bash
# If using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Run the contents of: supabase/migrations/20260108000000_add_auth_and_audit.sql
```

This creates:
- `user_roles` table for role assignments
- `audit_logs` table for action tracking
- Helper functions for role management and audit logging

### 2. Configure Environment Variables

Ensure these environment variables are set:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key

# Optional: Marketing Runner Secret (for cron jobs)
MARKETING_RUNNER_SECRET=your-secret-key
```

### 3. Configure Supabase Auth

In your Supabase Dashboard (Authentication > Settings):

1. **Enable Email Provider**
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email templates (optional)

2. **Set Email Confirmation**
   - Go to Authentication > Settings
   - Enable "Confirm email" (recommended)
   - Set "Site URL" to your production URL

3. **Configure Password Requirements**
   - Minimum length: 8 characters
   - The app enforces: lowercase, uppercase, numbers, special characters

4. **Set Redirect URLs**
   - Add your domain to "Redirect URLs"
   - Include: `https://yourdomain.com/api/auth/callback`

---

## Creating Admin Users

### Method 1: Supabase Dashboard (Recommended)

1. **Create User**
   - Go to Authentication > Users
   - Click "Add User"
   - Enter email and password
   - Click "Create User"
   - Note the user's UUID

2. **Assign Admin Role**
   - Go to SQL Editor
   - Run this query (replace `USER_UUID` with actual UUID):

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin');
```

3. **Verify Email (if required)**
   - If email confirmation is enabled, the user will receive a verification email
   - They must click the link before logging in

### Method 2: SQL Script

Run this complete script in Supabase SQL Editor:

```sql
-- 1. Create user (Supabase will hash the password)
-- Note: This requires service_role access
-- Replace email and password with actual values

-- First, create the user via Supabase Dashboard or API
-- Then assign the role:

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@fitflow.bg';
```

### Method 3: Supabase API (Programmatic)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY! // Use service role key
);

// Create user
const { data: user, error } = await supabase.auth.admin.createUser({
  email: 'admin@fitflow.bg',
  password: 'KAP7!!j1',
  email_confirm: true, // Skip email verification
});

if (user) {
  // Assign admin role
  await supabase
    .from('user_roles')
    .insert({
      user_id: user.user.id,
      role: 'admin',
    });
}
```

---

## User Login Flow

### 1. Access Login Page

Navigate to: `https://yourdomain.com/login`

### 2. Enter Credentials

- Email address
- Password (must meet requirements)

### 3. Email Verification

If email is not verified:
- Error message displayed
- "Resend verification email" button available
- User must verify email before accessing internal tools

### 4. Role Check

After successful login:
- Middleware checks for admin role
- Non-admin users receive 403 Forbidden
- Admin users redirected to `/internal`

### 5. Session Management

- Sessions persist across page navigation
- Default session duration: 7 days
- Automatic refresh handled by Supabase

---

## Changing Password

### For Logged-In Users

1. Navigate to `/account/change-password`
2. Enter current password
3. Enter new password (must meet requirements)
4. Confirm new password
5. Submit form

Password requirements:
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

### Password Reset (Forgot Password)

Currently not implemented in UI, but can be done via Supabase Dashboard:

1. Go to Authentication > Users
2. Find the user
3. Click "..." menu
4. Select "Send password reset email"

---

## Audit Logging

All critical actions are automatically logged to the `audit_logs` table.

### Logged Actions

**Campaign Actions:**
- `campaign.create` - Campaign created
- `campaign.update` - Campaign updated
- `campaign.start` - Campaign started
- `campaign.pause` - Campaign paused
- `campaign.resume` - Campaign resumed
- `campaign.cancel` - Campaign cancelled

**Follow-Up Actions:**
- `follow_up.create` - Follow-up campaign created
- `follow_up.populate` - Follow-up sends populated

**Recipient Actions:**
- `recipient.create` - Recipient added
- `recipient.update` - Recipient updated
- `recipient.import` - Bulk import
- `recipient.unsubscribe` - Recipient unsubscribed

**User Actions:**
- `user.login` - User logged in
- `user.logout` - User logged out
- `user.password_change` - Password changed

### Viewing Audit Logs

Query audit logs in Supabase SQL Editor:

```sql
-- All logs for a specific user
SELECT * FROM audit_logs
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC
LIMIT 50;

-- All logs for a specific campaign
SELECT * FROM audit_logs
WHERE entity_type = 'campaign'
  AND entity_id = 'CAMPAIGN_UUID'
ORDER BY created_at DESC;

-- All campaign start actions
SELECT * FROM audit_logs
WHERE action = 'campaign.start'
ORDER BY created_at DESC;

-- Recent activity (last 24 hours)
SELECT 
  al.*,
  u.email as user_email
FROM audit_logs al
JOIN auth.users u ON u.id = al.user_id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;
```

### Audit Log Retention

- Logs are immutable (cannot be updated or deleted)
- Recommended: Keep indefinitely for compliance
- If needed, archive old logs:

```sql
-- Archive logs older than 1 year
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Then delete from main table (if needed)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Security Best Practices

### Password Management

1. **Never share passwords**
   - Each admin should have their own account
   - No shared credentials

2. **Use strong passwords**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, special characters
   - Avoid common words or patterns

3. **Change passwords regularly**
   - Recommended: Every 90 days
   - Immediately if compromised

### Session Management

1. **Always log out**
   - Especially on shared computers
   - Use the logout button in the header

2. **Session timeout**
   - Default: 7 days
   - Sessions automatically expire
   - Re-login required after expiration

### Access Control

1. **Principle of least privilege**
   - Only assign admin role to users who need it
   - Use ops/marketing roles for limited access (future)

2. **Regular audits**
   - Review user_roles table monthly
   - Remove inactive users
   - Check audit logs for suspicious activity

### Environment Variables

1. **Never commit secrets**
   - Use `.env.local` for local development
   - Use Vercel/hosting platform secrets for production

2. **Rotate keys regularly**
   - Especially if exposed or compromised
   - Update in Supabase Dashboard and deployment platform

---

## Troubleshooting

### "Email not confirmed" Error

**Problem:** User cannot log in, sees email verification error.

**Solution:**
1. Check email for verification link
2. Click "Resend verification email" button
3. Or manually verify in Supabase Dashboard:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email = 'user@example.com';
   ```

### "Admin role required" Error

**Problem:** User can log in but gets 403 on internal pages.

**Solution:**
1. Check if user has admin role:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'USER_UUID';
   ```
2. If missing, add admin role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('USER_UUID', 'admin');
   ```

### "Authentication required" Error

**Problem:** Redirected to login even after signing in.

**Solution:**
1. Check browser cookies are enabled
2. Clear browser cache and cookies
3. Try incognito/private browsing mode
4. Check Supabase Auth settings (Site URL, Redirect URLs)

### Password Reset Not Working

**Problem:** Password reset email not received.

**Solution:**
1. Check spam folder
2. Verify email provider settings in Supabase
3. Manually reset via Supabase Dashboard:
   - Authentication > Users
   - Find user > "..." menu > "Send password reset email"

### Middleware Errors

**Problem:** 500 errors on internal pages.

**Solution:**
1. Check environment variables are set correctly
2. Verify database migration ran successfully
3. Check Supabase connection
4. Review server logs for specific errors

---

## Rollback Procedure

If authentication system causes issues:

### Full Rollback

1. **Revert code changes**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Database remains intact**
   - user_roles and audit_logs tables remain
   - No data loss
   - Can re-enable auth later

3. **Remove middleware**
   ```bash
   rm middleware.ts
   ```

---

## Future Enhancements

### Planned Features

1. **Additional Roles**
   - `ops` - Operations team (limited access)
   - `marketing` - Marketing team (campaigns only)

2. **Password Reset UI**
   - Forgot password link on login page
   - Self-service password reset flow

3. **Two-Factor Authentication**
   - TOTP-based 2FA
   - SMS-based 2FA (optional)

4. **Audit Log Viewer**
   - Internal UI for viewing audit logs
   - Filtering and search capabilities
   - Export to CSV

5. **User Management UI**
   - Admin panel for managing users
   - Role assignment interface
   - User activity dashboard

---

## Support

For issues or questions:

1. Check this documentation
2. Review Supabase Auth documentation
3. Check audit logs for errors
4. Contact development team

---

**Last Updated:** January 6, 2026
**Version:** 1.0.0
