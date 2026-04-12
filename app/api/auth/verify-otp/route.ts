/**
 * Public API - Verify OTP
 *
 * POST /api/auth/verify-otp
 *
 * Verifies a 6-digit OTP against the stored hash.
 * On success, either creates a new account (register) or finds the
 * existing account (login), then returns a tokenHash for the client
 * to establish a browser session via supabase.auth.verifyOtp().
 *
 * Rate-limited: 10 requests/min per IP.
 */

import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/catalog';
import { sanitizeInput } from '@/lib/utils/sanitize';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { getUserByEmail } from '@/lib/auth/get-user-by-email';
import { syncNewUser } from '@/lib/email/contact-sync';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ---- Rate limiting ---------------------------------------------------
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const withinLimit = await checkRateLimit(`verify_otp_ip:${ip}`, 10, 60);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ---- Parse & validate body -------------------------------------------
    const body = await request.json();
    const { email, otp, fullName, intent } = body as {
      email?: string;
      otp?: string;
      fullName?: string;
      intent?: 'register' | 'login';
    };

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Невалиден email адрес.' }, { status: 400 });
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Невалиден код.' }, { status: 400 });
    }

    if (!intent || !['register', 'login'].includes(intent)) {
      return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ---- Fetch OTP row ---------------------------------------------------
    const { data: otpRow, error: fetchError } = await supabaseAdmin
      .from('email_otp_verifications')
      .select('otp_hash, attempts, expires_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      console.error('[verify-otp] DB fetch failed:', fetchError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    if (!otpRow) {
      return NextResponse.json(
        { error: 'Кодът е изтекъл. Моля, заявете нов.' },
        { status: 400 },
      );
    }

    // Check expiry
    if (new Date(otpRow.expires_at) <= new Date()) {
      await supabaseAdmin.from('email_otp_verifications').delete().eq('email', normalizedEmail);
      return NextResponse.json(
        { error: 'Кодът е изтекъл. Моля, заявете нов.' },
        { status: 400 },
      );
    }

    // Check max attempts
    if (otpRow.attempts >= 5) {
      await supabaseAdmin.from('email_otp_verifications').delete().eq('email', normalizedEmail);
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, заявете нов код.' },
        { status: 400 },
      );
    }

    // Increment attempts
    await supabaseAdmin
      .from('email_otp_verifications')
      .update({ attempts: otpRow.attempts + 1 })
      .eq('email', normalizedEmail);

    // ---- Compare OTP hash ------------------------------------------------
    const inputHash = hashOtp(otp);
    if (!constantTimeCompare(inputHash, otpRow.otp_hash)) {
      return NextResponse.json({ error: 'Невалиден код.' }, { status: 400 });
    }

    // ---- OTP valid → delete it (one-time use) ----------------------------
    await supabaseAdmin.from('email_otp_verifications').delete().eq('email', normalizedEmail);

    // ---- Branch: register or login ---------------------------------------
    if (intent === 'register') {
      // Validate fullName for registration
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        return NextResponse.json({ error: 'Полето за име е задължително.' }, { status: 400 });
      }

      const sanitizedName = sanitizeInput(fullName.trim(), 100);
      if (!sanitizedName) {
        return NextResponse.json({ error: 'Полето за име е задължително.' }, { status: 400 });
      }

      // Check user doesn't already exist
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Потребител с този имейл вече съществува. Моля, влезте.' },
          { status: 409 },
        );
      }

      // Create user (email_confirm: true since OTP already proved ownership)
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: sanitizedName,
          has_password: false,
        },
      });

      if (createError) {
        if (createError.message?.includes('already registered')) {
          return NextResponse.json(
            { error: 'Потребител с този имейл вече съществува. Моля, влезте.' },
            { status: 409 },
          );
        }
        console.error('[verify-otp] createUser failed:', createError);
        return NextResponse.json(
          { error: 'Възникна грешка. Моля, опитайте по-късно.' },
          { status: 500 },
        );
      }

      // Sync to Brevo (fire-and-forget)
      const nameParts = sanitizedName.split(/\s+/);
      syncNewUser({
        email: normalizedEmail,
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') || undefined,
      }).catch((err) => {
        console.warn('[verify-otp] syncNewUser failed:', err);
      });
    } else {
      // Login: verify user exists
      const existingUser = await getUserByEmail(normalizedEmail);
      if (!existingUser) {
        return NextResponse.json(
          { error: 'Не намерихме акаунт с този имейл.' },
          { status: 404 },
        );
      }
    }

    // ---- Generate magic link token for session establishment --------------
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[verify-otp] generateLink failed:', linkError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tokenHash: linkData.properties.hashed_token,
    });
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте по-късно.' },
      { status: 500 },
    );
  }
}
