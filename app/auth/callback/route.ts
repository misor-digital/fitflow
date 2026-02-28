import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncNewUser } from '@/lib/email/contact-sync';

/**
 * Handles the auth callback from Supabase (email confirmations, magic links, password reset).
 * Exchanges the auth code for a session and redirects.
 *
 * Error codes:
 *  - missing_code    — no `code` query param present
 *  - code_expired    — the auth code was already used or has expired
 *  - exchange_failed — generic code-exchange failure
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  /* ------------------------------------------------------------------
   * Helper: build a safe redirect URL for error states.
   * Preserves the `next` context so users can retry the intended flow.
   * ----------------------------------------------------------------*/
  function errorRedirect(errorCode: string) {
    const target = new URL('/login', origin);
    target.searchParams.set('error', errorCode);
    if (next && next !== '/') {
      target.searchParams.set('next', next);
    }
    return NextResponse.redirect(target.toString());
  }

  /* --- Guard: code must be present -------------------------------- */
  if (!code) {
    console.error('[auth/callback] Missing auth code in callback URL');
    return errorRedirect('missing_code');
  }

  /* --- Exchange the code for a session ----------------------------- */
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Supabase returns specific messages for expired / already-used codes
    const isExpired =
      error.message?.toLowerCase().includes('expired') ||
      error.message?.toLowerCase().includes('already used') ||
      error.code === 'otp_expired';

    const errorCode = isExpired ? 'code_expired' : 'exchange_failed';

    console.error('[auth/callback] Code exchange failed', {
      errorCode,
      message: error.message,
      status: error.status,
      next,
    });

    return errorRedirect(errorCode);
  }

  /* --- Success: sync user & redirect ------------------------------ */
  if (data?.user?.email) {
    const fullName = data.user.user_metadata?.full_name as string | undefined;
    const nameParts = (fullName ?? '').trim().split(/\s+/);
    syncNewUser({
      email: data.user.email,
      firstName: nameParts[0] || '',
      lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined,
    }).catch(console.error);
  }

  // Redirect to the intended destination
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}
