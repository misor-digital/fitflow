/**
 * POST /api/auth/send-password-reset
 * Sends a FitFlow-branded password reset email using Brevo.
 * Bypasses Supabase's built-in reset email.
 *
 * Body: { email: string }
 * Always returns { success: true } to prevent user enumeration.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import { generatePasswordResetEmail } from '@/lib/email/templates';
import { isValidEmail } from '@/lib/catalog';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Полето email е задължително.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Невалиден имейл адрес.' },
        { status: 400 },
      );
    }

    // Look up user display name; fall back to email username portion
    let name = normalizedEmail.split('@')[0];
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === normalizedEmail);
      const profileName = user?.user_metadata?.full_name;
      if (profileName) name = profileName;
    } catch {
      /* use fallback */
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      // User may not exist — always return success to prevent enumeration
      console.warn('[send-password-reset] generateLink failed:', linkError);
      return NextResponse.json({ success: true });
    }

    const callbackUrl = new URL('/auth/callback', siteUrl);
    callbackUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
    callbackUrl.searchParams.set('type', 'recovery');
    callbackUrl.searchParams.set('next', '/reset-password');

    const htmlContent = generatePasswordResetEmail(name, callbackUrl.toString());

    await sendTransactionalEmail({
      to: { email: normalizedEmail, name: name.trim() },
      subject: 'FitFlow — Нулиране на парола',
      htmlContent,
      tags: ['auth', 'password-reset'],
      category: 'password-reset',
    });

    // Always return success to prevent user enumeration
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-password-reset] Unexpected error:', err);
    // Still return success to prevent enumeration
    return NextResponse.json({ success: true });
  }
}
