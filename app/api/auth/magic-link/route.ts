/**
 * Public API — Magic-Link Login
 *
 * POST /api/auth/magic-link
 *
 * Generates a magic link for an existing user and sends it
 * via a branded Brevo email. Does not create new accounts.
 * Rate-limited to 5 requests/minute per IP.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { isValidEmail } from '@/lib/catalog';
import { sendEmail } from '@/lib/email/emailService';
import { generateMagicLinkLoginEmail } from '@/lib/email/templates';

const SUCCESS_RESPONSE = { success: true };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ---- Rate limiting ---------------------------------------------------
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const withinLimit = await checkRateLimit('login_magic:' + ip, 5, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ---- Parse & validate body -------------------------------------------
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Моля, въведете валиден имейл адрес.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Моля, въведете валиден имейл адрес.' },
        { status: 400 },
      );
    }

    // ---- Anti-enumeration check ------------------------------------------
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    if (!userExists) {
      console.warn('[magic-link] Login attempt for non-existent email');
      return NextResponse.json(SUCCESS_RESPONSE);
    }

    // ---- Generate magic link ---------------------------------------------
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg'}/auth/callback`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[magic-link] Failed to generate link:', linkError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте отново.' },
        { status: 500 },
      );
    }

    const loginUrl = linkData.properties.action_link;

    // ---- Send branded email via Brevo ------------------------------------
    await sendEmail({
      to: { email: normalizedEmail },
      subject: 'Вход във FitFlow',
      htmlContent: generateMagicLinkLoginEmail(loginUrl),
      tags: ['magic-link-login'],
    });

    return NextResponse.json(SUCCESS_RESPONSE);
  } catch (error) {
    console.error('[magic-link] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
