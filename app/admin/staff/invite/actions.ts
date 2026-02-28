'use server';

import { requireStaff } from '@/lib/auth';
import { outranks, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { sendEmail } from '@/lib/email/emailService';
import { generateStaffInviteEmail } from '@/lib/email/templates';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { StaffRole } from '@/lib/supabase/types';

const roleDisplayNames: Record<StaffRole, string> = {
  super_admin: 'Супер Админ',
  admin: 'Админ',
  manager: 'Мениджър',
  marketing: 'Маркетинг',
  support: 'Поддръжка',
  finance: 'Финанси',
  warehouse: 'Склад',
  content: 'Съдържание',
  analyst: 'Анализатор',
};

interface InviteData {
  email: string;
  fullName: string;
  role: StaffRole;
}

export async function inviteStaff(data: InviteData) {
  // 1. Verify actor has invite permission
  const session = await requireStaff([...STAFF_MANAGEMENT_ROLES]);
  const actorRole = session.profile.staff_role!;

  // 2. Verify actor outranks the target role
  if (!outranks(actorRole, data.role) && actorRole !== 'super_admin') {
    return { error: 'Нямате право да каните служител с тази роля' };
  }

  // 3. Validate inputs
  if (!data.email.trim() || !data.fullName.trim()) {
    return { error: 'Имейл и име са задължителни' };
  }

  const email = data.email.trim().toLowerCase();
  const fullName = data.fullName.trim();

  // 4a. Create user via admin API
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      invited_role: data.role,
      invited_by: session.userId,
    },
  });

  if (createError) {
    console.error('Error creating staff user:', createError);
    if (createError.message?.includes('already been registered')) {
      return { error: 'Този имейл вече е регистриран' };
    }
    return { error: 'Грешка при създаване на акаунт' };
  }

  // 4b. Generate a magic link for password setup
  let setupUrl: string | null = null;
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('Error generating setup link:', linkError);
  } else {
    // Build a direct callback URL with the hashed token (bypasses PKCE mismatch).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';
    const callbackUrl = new URL('/auth/callback', siteUrl);
    callbackUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
    callbackUrl.searchParams.set('type', 'magiclink');
    callbackUrl.searchParams.set('next', '/setup-password');
    setupUrl = callbackUrl.toString();
  }

  // 4c. Send custom Brevo email
  let emailFailed = false;
  if (setupUrl) {
    const result = await sendEmail({
      to: { email, name: fullName },
      subject: 'Покана за екипа на FitFlow',
      htmlContent: generateStaffInviteEmail(
        fullName,
        roleDisplayNames[data.role] ?? data.role,
        setupUrl,
      ),
      tags: ['staff-invite'],
    });

    if (!result.success) {
      console.error('Error sending staff invite email:', result.error);
      emailFailed = true;
    }
  }

  // 5. If user was created, the trigger creates a customer profile.
  //    Upgrade to staff immediately.
  if (userData?.user) {
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        user_type: 'staff',
        staff_role: data.role,
        full_name: fullName,
      })
      .eq('id', userData.user.id);

    if (profileError) {
      console.error('Error upgrading profile to staff:', profileError);
      return { error: 'Акаунтът е създаден, но профилът не беше обновен. Моля, обновете ръчно.' };
    }
  }

  // Return appropriate message based on partial failures
  if (linkError) {
    return { error: 'Акаунтът е създаден, но линкът за парола не беше генериран. Моля, използвайте "Забравена парола".' };
  }

  if (emailFailed) {
    return { error: 'Акаунтът е създаден, но имейлът не беше изпратен. Моля, уведомете служителя ръчно.' };
  }

  return { error: null };
}
