'use server';

import { requireStaff } from '@/lib/auth';
import { outranks, STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { StaffRole } from '@/lib/supabase/types';

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

  // 4. Create the invited user via Supabase Auth admin API
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: {
        full_name: data.fullName.trim(),
        invited_role: data.role,        // Stored in user_metadata for the setup-password page
        invited_by: session.userId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg'}/auth/callback?next=/setup-password`,
    }
  );

  if (inviteError) {
    console.error('Error inviting staff:', inviteError);
    if (inviteError.message?.includes('already been registered')) {
      return { error: 'Този имейл вече е регистриран' };
    }
    return { error: 'Грешка при изпращане на покана' };
  }

  // 5. If user was created, the trigger creates a customer profile.
  //    Upgrade to staff immediately.
  if (inviteData?.user) {
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        user_type: 'staff',
        staff_role: data.role,
        full_name: data.fullName.trim(),
      })
      .eq('id', inviteData.user.id);

    if (profileError) {
      console.error('Error upgrading profile to staff:', profileError);
      // User was created but profile not upgraded — log for manual fix
      return { error: 'Поканата е изпратена, но профилът не беше обновен. Моля, обновете ръчно.' };
    }
  }

  return { error: null };
}
