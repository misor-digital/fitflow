'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isPhoneFormatValid, MAX_PHONE_LENGTH } from '@/lib/catalog';

export async function updateProfile(data: { firstName: string; lastName: string; phone: string }) {
  const session = await requireAuth();

  // Validate
  if (!data.firstName.trim()) {
    return { error: 'Първото име е задължително' };
  }
  if (!data.lastName.trim()) {
    return { error: 'Фамилията е задължителна' };
  }
  if (data.firstName.length + data.lastName.length > 100) {
    return { error: 'Името е прекалено дълго' };
  }
  if (!data.phone.trim()) {
    return { error: 'Телефонният номер е задължителен' };
  }
  if (data.phone.trim().length > MAX_PHONE_LENGTH) {
    return { error: 'Телефонът е прекалено дълъг' };
  }
  if (!isPhoneFormatValid(data.phone)) {
    return { error: 'Невалиден телефонен номер' };
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      phone: data.phone.trim() || null,
    })
    .eq('id', session.userId);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Грешка при обновяване. Опитайте отново.' };
  }

  return { error: null };
}
