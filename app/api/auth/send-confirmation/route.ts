/**
 * POST /api/auth/send-confirmation
 * Sends a FitFlow-branded email confirmation using Brevo.
 * Bypasses Supabase's built-in confirmation email.
 *
 * Body: { email: string, firstName: string, lastName: string }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import { generateEmailConfirmationEmail } from '@/lib/email/templates';
import { isValidEmail } from '@/lib/catalog';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, firstName, lastName } = body as { email?: string; firstName?: string; lastName?: string };

    if (!email || typeof email !== 'string' || !firstName || typeof firstName !== 'string' || !lastName || typeof lastName !== 'string') {
      return NextResponse.json(
        { error: 'Полетата email, firstName и lastName са задължителни.' },
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[send-confirmation] generateLink failed:', linkError);
      return NextResponse.json(
        { error: 'Неуспешно генериране на линк за потвърждение.' },
        { status: 500 },
      );
    }

    const callbackUrl = new URL('/auth/callback', siteUrl);
    callbackUrl.searchParams.set('token_hash', linkData.properties.hashed_token);
    callbackUrl.searchParams.set('type', 'magiclink');

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    const htmlContent = generateEmailConfirmationEmail(
      displayName,
      callbackUrl.toString(),
    );

    await sendTransactionalEmail({
      to: { email: normalizedEmail, name: displayName },
      subject: 'FitFlow - Потвърди имейла си',
      htmlContent,
      tags: ['auth', 'email-confirmation'],
      category: 'email-confirmation',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-confirmation] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Възникна неочаквана грешка.' },
      { status: 500 },
    );
  }
}
