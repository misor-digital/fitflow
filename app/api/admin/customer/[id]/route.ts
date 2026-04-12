import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { STAFF_MANAGEMENT_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidPhone } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { sendEmail, generateProfileUpdatedEmail, generateAccountDeletedEmail } from '@/lib/email';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_NAME_LENGTH = 100;

// ============================================================================
// PUT /api/admin/customer/[id] — Edit customer profile
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') ?? 'unknown';
    const allowed = await checkRateLimit(`admin-customer-edit:${ip}`, 20, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Твърде много заявки. Опитайте отново след малко.' }, { status: 429 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Невалиден идентификатор.' }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    // Validate required fields
    if (typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
    }
    if (typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json({ error: 'Фамилията е задължителна.' }, { status: 400 });
    }
    if (firstName.trim().length > MAX_NAME_LENGTH || lastName.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'Името е прекалено дълго.' }, { status: 400 });
    }

    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
    if (!trimmedPhone) {
      return NextResponse.json({ error: 'Телефонът е задължителен.' }, { status: 400 });
    }
    if (!isValidPhone(trimmedPhone)) {
      return NextResponse.json({ error: 'Невалиден телефонен номер.' }, { status: 400 });
    }

    // Fetch current profile to detect changes
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('first_name, last_name, phone')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Потребителят не е намерен.' }, { status: 404 });
    }

    const updates: Record<string, string> = {};
    if (current.first_name !== firstName.trim()) updates.first_name = firstName.trim();
    if (current.last_name !== lastName.trim()) updates.last_name = lastName.trim();
    if ((current.phone ?? '') !== trimmedPhone) updates.phone = trimmedPhone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'Няма промени.' });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer profile:', updateError);
      return NextResponse.json({ error: 'Грешка при обновяване на профила.' }, { status: 500 });
    }

    // Send email notification (fire-and-forget)
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id);
    const customerEmail = authData?.user?.email;
    if (customerEmail) {
      const changes: { label: string; oldValue: string; newValue: string }[] = [];
      if (updates.first_name) changes.push({ label: 'Име', oldValue: current.first_name, newValue: updates.first_name });
      if (updates.last_name) changes.push({ label: 'Фамилия', oldValue: current.last_name, newValue: updates.last_name });
      if (updates.phone) changes.push({ label: 'Телефон', oldValue: current.phone ?? '—', newValue: updates.phone });

      sendEmail({
        to: { email: customerEmail, name: `${updated.first_name} ${updated.last_name}` },
        subject: 'Профилът ти във FitFlow беше обновен',
        htmlContent: generateProfileUpdatedEmail({ changes }),
        tags: ['admin-profile-update'],
      }).catch((err) => console.error('Failed to send profile update email:', err));
    }

    console.log(
      `[Admin] Profile updated for ${id} by ${session.profile.id} (${session.profile.staff_role}): ${Object.keys(updates).join(', ')}`,
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/customer/[id] error:', err);
    return NextResponse.json({ error: 'Вътрешна грешка.' }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/admin/customer/[id] — Delete customer account
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (
      !session.profile.staff_role ||
      !STAFF_MANAGEMENT_ROLES.has(session.profile.staff_role)
    ) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') ?? 'unknown';
    const allowed = await checkRateLimit(`admin-customer-delete:${ip}`, 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Твърде много заявки. Опитайте отново след малко.' }, { status: 429 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Невалиден идентификатор.' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (id === session.profile.id) {
      return NextResponse.json({ error: 'Не може да изтриете собствения си акаунт.' }, { status: 400 });
    }

    // Fetch profile + email before deletion
    const [{ data: profile }, { data: authData }] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('first_name, last_name, user_type').eq('id', id).single(),
      supabaseAdmin.auth.admin.getUserById(id),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Потребителят не е намерен.' }, { status: 404 });
    }

    // Don't allow deleting staff through customer API
    if (profile.user_type === 'staff') {
      return NextResponse.json({ error: 'Не може да изтриете персонал чрез тази операция.' }, { status: 403 });
    }

    // Check for active subscriptions
    const { data: activeSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', id)
      .eq('status', 'active')
      .limit(1);

    if (activeSubs && activeSubs.length > 0) {
      return NextResponse.json(
        { error: 'Не може да изтриете клиент с активен абонамент. Първо отменете абонамента.' },
        { status: 409 },
      );
    }

    const customerEmail = authData?.user?.email;
    const displayName = `${profile.first_name} ${profile.last_name}`;

    // Delete addresses, then profile, then auth user
    await supabaseAdmin.from('addresses').delete().eq('user_id', id);
    await supabaseAdmin.from('user_profiles').delete().eq('id', id);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error('Error deleting auth user:', authError);
      // Profile already deleted — log but continue
    }

    // Send farewell email (fire-and-forget)
    if (customerEmail) {
      sendEmail({
        to: { email: customerEmail, name: displayName },
        subject: 'Акаунтът ти във FitFlow беше изтрит',
        htmlContent: generateAccountDeletedEmail(),
        tags: ['admin-account-deleted'],
      }).catch((err) => console.error('Failed to send account deletion email:', err));
    }

    console.log(
      `[Admin] Account deleted for ${id} (${displayName}) by ${session.profile.id} (${session.profile.staff_role})`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/customer/[id] error:', err);
    return NextResponse.json({ error: 'Вътрешна грешка.' }, { status: 500 });
  }
}
