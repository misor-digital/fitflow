# Authentication Setup

## Prerequisites

- Supabase project with Auth enabled
- Migration from Portion 1 applied (`user_profiles` table, `handle_new_user` trigger)
- Environment variables configured (see below)

## Environment Variables

### Required for Auth

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Browser-safe key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | `.env.local` | Server-only admin key (`sb_secret_…`) |

### Supabase Dashboard Settings

1. **Authentication → Providers**: Enable the **Email** provider.
2. **Authentication → Email Templates**: Customise confirmation & magic-link templates as needed.
3. **Authentication → URL Configuration**:
   - Site URL: `https://fitflow.bg`
   - Redirect URLs: `https://fitflow.bg/auth/callback`, `http://localhost:3000/auth/callback`
4. **Authentication → Password Policy**:
   - Minimum length: **8**
   - Require lowercase: ✓
   - Require uppercase: ✓
   - Require digit: ✓
   - Require symbol: ✓

## Seed Super Admin

The seed script bootstraps the first `super_admin` user into Supabase Auth and the `user_profiles` table.

### 1. Set credentials

Add these to `.env.local` or export them in your shell:

```bash
export SUPER_ADMIN_EMAIL="admin@fitflow.bg"
export SUPER_ADMIN_PASSWORD="YourSecurePassword1!"
export SUPER_ADMIN_NAME="Super Admin"
```

### 2. Dry run (validate only)

```bash
npx tsx scripts/seed-super-admin.ts --dry-run
```

This checks that all env vars are present and the password meets the policy without creating any user.

### 3. Create the super admin

```bash
npx tsx scripts/seed-super-admin.ts
```

Or use the npm script shortcut:

```bash
pnpm seed:admin
```

### What the script does

1. Reads env vars from `.env.local` / shell.
2. Validates the password against the policy (8+ chars, lowercase, uppercase, digit, symbol).
3. Creates an auth user via `supabase.auth.admin.createUser()` with `email_confirm: true`.
4. The `handle_new_user` database trigger auto-creates a `user_profiles` row (`user_type = 'customer'`).
5. The script upgrades the profile to `user_type = 'staff'`, `staff_role = 'super_admin'`.
6. If the user already exists, it prints a warning and attempts to update the role instead.

## Verify Setup

1. **Login**: Navigate to `/login` and sign in with the super admin credentials.
2. **Admin panel**: Navigate to `/admin` — you should see the admin dashboard.
3. **Supabase Auth**: Check **Authentication → Users** in the Supabase dashboard — confirm the user exists with `email_confirmed_at` set.
4. **Profile**: Query the `user_profiles` table — confirm `user_type = 'staff'` and `staff_role = 'super_admin'`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Missing required environment variables` | Ensure `.env.local` has all required vars, or export them in your shell. |
| `Password does not meet policy requirements` | Use 8+ characters with lowercase, uppercase, digit, and symbol. |
| `User already exists` | The script will attempt to update the existing user's role. This is safe to re-run. |
| Connection errors / `ECONNREFUSED` | Verify `NEXT_PUBLIC_SUPABASE_URL` is correct and the Supabase project is running. |
| Profile not upgraded | The script waits briefly for the trigger. If it fails, re-run the script to retry. |

## Custom Auth Emails via Brevo

FitFlow sends its own branded auth emails instead of using Supabase's built-in templates.

### How It Works

1. **Email Confirmation**: `RegisterForm.tsx` calls `supabase.auth.signUp()` to create the user, then fires a request to `POST /api/auth/send-confirmation`. The API route uses `supabase.auth.admin.generateLink({ type: 'signup' })` to generate a verification token and sends a branded email through Brevo.

2. **Password Reset**: `ForgotPasswordForm.tsx` calls `POST /api/auth/send-password-reset` instead of `supabase.auth.resetPasswordForEmail()`. The API route uses `supabase.auth.admin.generateLink({ type: 'recovery' })`.

3. **Magic Link Registration**: Already handled by `POST /api/auth/register-magic` (sends via Brevo).

4. **Magic Link Login**: Already handled by `POST /api/auth/magic-link` (sends via Brevo).

### Supabase Dashboard Configuration

To prevent duplicate emails from Supabase's built-in system:

1. Go to **Authentication → Email Templates** in the Supabase Dashboard
2. Consider disabling automatic confirmation emails if using `generateLink` exclusively
3. Or configure **Custom SMTP** in Supabase to route through Brevo SMTP for consistency

> **Note**: Until Supabase's built-in emails are disabled, users may receive two confirmation emails on registration (one from Supabase, one branded from Brevo). The branded one should be preferred.
