/**
 * Admin API - Create Customer Account
 *
 * POST /api/admin/create-customer
 *
 * Creates a new customer account (or returns an existing one) so admins
 * can convert phone-based preorders into real orders.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/catalog';
import { sendEmail } from '@/lib/email/emailService';
import { generateCustomerInviteEmail } from '@/lib/email/templates';
import { syncNewUser } from '@/lib/email/contact-sync';
import { getUserByEmail } from '@/lib/auth/get-user-by-email';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    // ---- Input validation ------------------------------------------------
    const body = await request.json();
    const { email, firstName, lastName } = body as { email?: string; firstName?: string; lastName?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Полето email е задължително.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Невалиден email адрес.' },
        { status: 400 },
      );
    }

    if (!firstName || typeof firstName !== 'string' || !firstName.trim() ||
        !lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json(
        { error: 'Полетата firstName и lastName са задължителни.' },
        { status: 400 },
      );
    }

    if (firstName.trim().length + lastName.trim().length > 100) {
      return NextResponse.json(
        { error: 'Името не може да надвишава 100 символа.' },
        { status: 400 },
      );
    }

    // ---- Check if user already exists ------------------------------------
    const existingUser = await getUserByEmail(normalizedEmail);

    if (existingUser) {
      return NextResponse.json(
        { userId: existingUser.id, alreadyExisted: true },
        { status: 200 },
      );
    }

    // ---- Create user -----------------------------------------------------
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          created_by_admin: true,
          created_by: session.userId,
          has_password: false,
        },
      });

    if (createError) {
      // Race condition: user was created between the check and createUser
      if (createError.message?.includes('already registered')) {
        const retryUser = await getUserByEmail(normalizedEmail);
        if (retryUser) {
          return NextResponse.json(
            { userId: retryUser.id, alreadyExisted: true },
            { status: 200 },
          );
        }
      }

      console.error('[create-customer] createUser failed:', createError);
      return NextResponse.json(
        { error: 'Грешка при създаване на потребител.' },
        { status: 500 },
      );
    }

    // ---- Generate setup link ---------------------------------------------
    let setupUrl: string | undefined;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.warn(
        '[create-customer] generateLink failed (user can use forgot-password):',
        linkError,
      );
    } else {
      // Build a direct callback URL with the hashed token (bypasses PKCE mismatch).
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';
      const callbackUrl = new URL('/auth/callback', siteUrl);
      callbackUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
      callbackUrl.searchParams.set('type', 'magiclink');
      callbackUrl.searchParams.set('next', '/setup-password');
      setupUrl = callbackUrl.toString();
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    // ---- Send customer invite email via Brevo ----------------------------
    if (setupUrl) {
      try {
        await sendEmail({
          to: { email: normalizedEmail, name: displayName },
          subject: 'Активирай акаунта си във FitFlow',
          htmlContent: generateCustomerInviteEmail(displayName, setupUrl),
          tags: ['customer-invite'],
        });
      } catch (emailErr) {
        console.warn(
          '[create-customer] Failed to send invite email:',
          emailErr,
        );
      }
    }

    // ---- Sync to Brevo contacts (fire-and-forget) ------------------------
    syncNewUser({
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
    }).catch(() => {}); // fire-and-forget

    // ---- Auto-link preorders ---------------------------------------------
    await supabaseAdmin
      .from('preorders')
      .update({ user_id: userData.user.id })
      .eq('email', normalizedEmail)
      .is('user_id', null);

    // ---- Audit log -------------------------------------------------------
    console.log('[AdminAudit] Customer account created', {
      action: 'create_customer',
      adminId: session.userId,
      customerId: userData.user.id,
      customerEmail: normalizedEmail,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { userId: userData.user.id, alreadyExisted: false },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[create-customer]', err);
    return NextResponse.json(
      { error: 'Възникна грешка при създаване на акаунт.' },
      { status: 500 },
    );
  }
}
