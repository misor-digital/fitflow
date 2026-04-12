/**
 * Public API - Send OTP
 *
 * POST /api/auth/send-otp
 *
 * Generates a 6-digit OTP, stores its SHA-256 hash in the database,
 * and sends the code to the provided email via Brevo.
 * Used for inline registration and login during the order flow.
 *
 * Rate-limited: 5 requests/min per IP, 3 requests/min per email.
 */

import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { sendEmail } from '@/lib/email/emailService';
import { generateOtpVerificationEmail } from '@/lib/email/templates';

const OTP_EXPIRY_SECONDS = 600; // 10 minutes

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ---- Rate limiting ---------------------------------------------------
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

    const withinIpLimit = await checkRateLimit(`send_otp_ip:${ip}`, 5, 60);
    if (!withinIpLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ---- Parse & validate body -------------------------------------------
    const body = await request.json();
    const { email, name } = body as { email?: string; name?: string };

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

    // Per-email rate limit (prevents bombing a single address)
    const withinEmailLimit = await checkRateLimit(`send_otp_email:${normalizedEmail}`, 3, 60);
    if (!withinEmailLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити за този имейл. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    // ---- Generate OTP ----------------------------------------------------
    const otp = randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    // ---- Store OTP hash (upsert - one active OTP per email) ---------------
    const { error: dbError } = await supabaseAdmin
      .from('email_otp_verifications')
      .upsert(
        {
          email: normalizedEmail,
          otp_hash: otpHash,
          attempts: 0,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'email' },
      );

    if (dbError) {
      console.error('[send-otp] DB upsert failed:', dbError);
      return NextResponse.json(
        { error: 'Възникна грешка. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    // ---- Send email via Brevo --------------------------------------------
    const htmlContent = generateOtpVerificationEmail(otp, name?.trim() || undefined);

    const emailResult = await sendEmail({
      to: { email: normalizedEmail },
      subject: 'Код за потвърждение – FitFlow',
      htmlContent,
      tags: ['otp-verification'],
    });

    if (!emailResult.success) {
      console.error('[send-otp] Email send failed:', emailResult.error);
      return NextResponse.json(
        { error: 'Неуспешно изпращане на имейл. Моля, опитайте по-късно.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
    });
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте по-късно.' },
      { status: 500 },
    );
  }
}
