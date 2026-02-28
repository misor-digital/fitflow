/**
 * Public API — Magic-Link Registration
 *
 * POST /api/auth/register-magic
 *
 * Creates a new user account without a password and sends
 * a magic link to activate the account and optionally set a password.
 * Rate-limited to 5 requests/minute per IP.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/catalog';
import { sanitizeInput } from '@/lib/utils/sanitize';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { sendEmail } from '@/lib/email/emailService';
import { generateMagicRegistrationEmail } from '@/lib/email/templates';
import { syncNewUser } from '@/lib/email/contact-sync';

const SUCCESS_RESPONSE = {
  success: true,
  message: 'Проверете имейла си за линк за активация.',
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ---- Rate limiting ---------------------------------------------------
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const withinLimit = await checkRateLimit('register_magic:' + ip, 5, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ---- Parse & validate body -------------------------------------------
    const body = await request.json();
    const { email, fullName, wantsPromos } = body as {
      email?: string;
      fullName?: string;
      wantsPromos?: boolean;
    };

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

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Полето за име е задължително.' },
        { status: 400 },
      );
    }

    const sanitizedName = sanitizeInput(fullName, 100);

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Полето за име е задължително.' },
        { status: 400 },
      );
    }

    const isSubscriber = Boolean(wantsPromos);

    // ---- Anti-enumeration check ------------------------------------------
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    if (existingUser) {
      console.warn(
        '[register-magic] Registration attempt for existing email:',
        normalizedEmail,
      );
      return NextResponse.json(SUCCESS_RESPONSE);
    }

    // ---- Create user -----------------------------------------------------
    const { data: _userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: false,
        user_metadata: {
          full_name: sanitizedName,
          is_subscriber: isSubscriber,
          has_password: false,
        },
      });

    if (createError) {
      // Race condition: user was created between the check and createUser
      if (createError.message?.includes('already registered')) {
        console.warn(
          '[register-magic] Race condition — user already registered:',
          normalizedEmail,
        );
        return NextResponse.json(SUCCESS_RESPONSE);
      }

      console.error('[register-magic] createUser failed:', createError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    // ---- Generate magic link ---------------------------------------------
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[register-magic] generateLink failed:', linkError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    // Build a direct callback URL with the hashed token (bypasses PKCE mismatch).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';
    const callbackUrl = new URL('/auth/callback', siteUrl);
    callbackUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
    callbackUrl.searchParams.set('type', 'magiclink');
    callbackUrl.searchParams.set('next', '/setup-password');
    const setupUrl: string | null = callbackUrl.toString();

    // ---- Send email ------------------------------------------------------
    if (setupUrl) {
      await sendEmail({
        to: { email: normalizedEmail, name: sanitizedName },
        subject: 'Активирайте акаунта си във FitFlow',
        htmlContent: generateMagicRegistrationEmail(sanitizedName, setupUrl),
        tags: ['magic-registration'],
      });
    }

    // ---- Brevo contact sync (fire-and-forget) ----------------------------
    const nameParts = sanitizedName.split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';

    syncNewUser({ email: normalizedEmail, firstName, lastName }).catch(
      (err) => {
        console.warn('[register-magic] syncNewUser failed:', err);
      },
    );

    // ---- Success ---------------------------------------------------------
    return NextResponse.json(SUCCESS_RESPONSE);
  } catch (error) {
    console.error('[register-magic] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте по-късно.' },
      { status: 500 },
    );
  }
}
