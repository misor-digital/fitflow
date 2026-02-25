/**
 * Seed Super Admin Script
 *
 * Bootstraps the first super_admin user in Supabase Auth + user_profiles.
 * Run via: npx tsx scripts/seed-super-admin.ts
 *
 * Requires env vars (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_PASSWORD
 *   SUPER_ADMIN_NAME  (optional, default: "Super Admin")
 *
 * Flags:
 *   --dry-run   Validate inputs without creating the user
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Load .env.local (does NOT override existing env vars)
// ---------------------------------------------------------------------------
config({ path: resolve(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// ---------------------------------------------------------------------------
// Read configuration
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function validateEnv(): void {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SECRET_KEY) missing.push('SUPABASE_SECRET_KEY');
  if (!SUPER_ADMIN_EMAIL) missing.push('SUPER_ADMIN_EMAIL');
  if (!SUPER_ADMIN_PASSWORD) missing.push('SUPER_ADMIN_PASSWORD');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error(
      '\nSet them in .env.local or export them before running this script.'
    );
    process.exit(1);
  }
}

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/\d/.test(password)) errors.push('Must contain a digit');
  if (!/[^a-zA-Z0-9]/.test(password))
    errors.push('Must contain a special character (symbol)');

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('🔧 FitFlow — Seed Super Admin\n');

  // 1. Validate environment ------------------------------------------------
  validateEnv();

  // 2. Validate password policy --------------------------------------------
  const { isValid, errors } = validatePassword(SUPER_ADMIN_PASSWORD!);
  if (!isValid) {
    console.error('❌ Password does not meet policy requirements:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log(`   Email : ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Name  : ${SUPER_ADMIN_NAME}`);
  console.log(`   URL   : ${SUPABASE_URL}`);
  console.log(`   Mode  : ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // 3. Dry-run exit --------------------------------------------------------
  if (dryRun) {
    console.log('✅ Dry run: all validations passed. No changes were made.');
    process.exit(0);
  }

  // 4. Create Supabase admin client ----------------------------------------
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 5. Create auth user ----------------------------------------------------
  console.log('Creating auth user…');

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL!,
      password: SUPER_ADMIN_PASSWORD!,
      email_confirm: true,
      user_metadata: { full_name: SUPER_ADMIN_NAME },
    });

  if (createError) {
    // Handle "user already exists" gracefully
    const alreadyExists =
      createError.message?.toLowerCase().includes('already') ||
      createError.message?.toLowerCase().includes('duplicate') ||
      createError.status === 422;

    if (alreadyExists) {
      console.warn(
        `⚠️  User with email "${SUPER_ADMIN_EMAIL}" already exists.`
      );
      console.log('   Attempting to look up existing user and update role…\n');

      // List users and find by email
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        process.exit(1);
      }

      const existingUser = listData.users.find(
        (u) => u.email === SUPER_ADMIN_EMAIL
      );

      if (!existingUser) {
        console.error('❌ Could not find existing user by email.');
        process.exit(1);
      }

      // Update profile to super_admin
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ user_type: 'staff', staff_role: 'super_admin' })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error(
          '❌ Failed to update user_profiles:',
          updateError.message
        );
        process.exit(1);
      }

      console.log(`✅ Updated existing user to super_admin.`);
      console.log(`   User ID: ${existingUser.id}`);
      process.exit(0);
    }

    // Other errors
    console.error('❌ Failed to create auth user:', createError.message);

    if (
      createError.message?.includes('fetch') ||
      createError.message?.includes('network') ||
      createError.message?.includes('ECONNREFUSED')
    ) {
      console.error('\nTroubleshooting:');
      console.error(
        '  1. Check that NEXT_PUBLIC_SUPABASE_URL is correct and reachable'
      );
      console.error('  2. Ensure SUPABASE_SECRET_KEY is a valid service_role / sb_secret_ key');
      console.error('  3. Verify the Supabase project is running');
    }

    process.exit(1);
  }

  const user = createData.user;
  console.log(`   Auth user created: ${user.id}\n`);

  // 6. Upgrade profile to super_admin -------------------------------------
  // The handle_new_user trigger creates the row with user_type='customer'.
  // We upgrade it here.
  console.log('Upgrading profile to super_admin…');

  // Brief delay to allow the trigger to fire
  await new Promise((r) => setTimeout(r, 1000));

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ user_type: 'staff', staff_role: 'super_admin' })
    .eq('id', user.id);

  if (profileError) {
    console.error(
      '❌ Failed to update user_profiles:',
      profileError.message
    );
    console.error(
      '   The auth user was created but the profile was not upgraded.'
    );
    console.error(
      '   You can re-run this script to retry the upgrade.'
    );
    process.exit(1);
  }

  // 7. Done ----------------------------------------------------------------
  console.log('\n✅ Super admin seeded successfully!');
  console.log(`   User ID : ${user.id}`);
  console.log(`   Email   : ${user.email}`);
  console.log(`   Role    : super_admin`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
