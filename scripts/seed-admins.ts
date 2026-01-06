/**
 * Admin User Seed Script
 * 
 * Seeds the initial admin users for the internal tools.
 * Uses Supabase Admin API to invite users (sends password reset email).
 * 
 * Usage:
 *   npx tsx scripts/seed-admins.ts
 * 
 * Required environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (NOT the anon key)
 * 
 * IMPORTANT: Run this BEFORE enabling auth enforcement in production.
 */

import { createClient } from '@supabase/supabase-js';

// Admin users to seed
const ADMIN_USERS = [
  { email: 'development@fitflow.bg', role: 'admin' },
  { email: 'admin@fitflow.bg', role: 'admin' },
];

async function seedAdmins() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
    process.exit(1);
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔐 Seeding admin users...\n');

  for (const admin of ADMIN_USERS) {
    console.log(`Processing: ${admin.email}`);

    try {
      // Check if user already exists in user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', admin.email)
        .single();

      if (existingProfile) {
        console.log(`  ⏭️  User already exists in profiles, skipping invite`);
        continue;
      }

      // Check if user exists in auth.users (might exist but not in profiles)
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingAuthUser = users?.find(u => u.email === admin.email);

      let userId: string;

      if (existingAuthUser) {
        console.log(`  ℹ️  User exists in auth, adding to profiles`);
        userId = existingAuthUser.id;
      } else {
        // Invite user via admin API (sends password reset email)
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(admin.email);

        if (inviteError) {
          console.error(`  ❌ Failed to invite: ${inviteError.message}`);
          continue;
        }

        if (!inviteData.user) {
          console.error(`  ❌ No user returned from invite`);
          continue;
        }

        userId = inviteData.user.id;
        console.log(`  ✉️  Invite sent to ${admin.email}`);
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: admin.email,
          name: admin.email.split('@')[0],
          user_type: 'admin',
          role: admin.role,
          is_active: true,
        });

      if (profileError) {
        console.error(`  ❌ Failed to create profile: ${profileError.message}`);
        continue;
      }

      console.log(`  ✅ Admin profile created (role: ${admin.role})`);

    } catch (error) {
      console.error(`  ❌ Error processing ${admin.email}:`, error);
    }
  }

  console.log('\n✨ Admin seeding complete!');
  console.log('\nNext steps:');
  console.log('1. Check email inboxes for password reset links');
  console.log('2. Set passwords for each admin user');
  console.log('3. Test login at /login');
  console.log('4. Verify access to /internal');
}

// Run the script
seedAdmins().catch(console.error);
