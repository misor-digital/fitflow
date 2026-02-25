'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function updateProfile(data: { fullName: string; phone: string }) {
  const session = await requireAuth();

  // Validate
  if (!data.fullName.trim()) {
    return { error: 'Името е задължително' };
  }
  if (data.fullName.length > 100) {
    return { error: 'Името е прекалено дълго' };
  }
  if (data.phone && data.phone.length > 20) {
    return { error: 'Телефонът е прекалено дълъг' };
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      full_name: data.fullName.trim(),
      phone: data.phone.trim() || null,
    })
    .eq('id', session.userId);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Грешка при обновяване. Опитайте отново.' };
  }

  return { error: null };
}
