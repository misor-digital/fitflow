import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncNewUser } from '@/lib/email/contact-sync';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Handles the auth callback from Supabase (email confirmations, magic links, password reset).
 *
 * Supports two verification flows:
 *  1. PKCE code exchange  — `?code=<AUTH_CODE>` (OAuth, client-initiated OTP)
 *  2. Token-hash verify   — `?token_hash=<HASH>&type=<OTP_TYPE>` (server-generated magic links)
 *
 * Error codes:
 *  - missing_code    — neither `code` nor `token_hash` present
 *  - code_expired    — the auth code / token was already used or has expired
 *  - exchange_failed — generic verification failure
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
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

  /* --- Guard: at least one verification param must be present ------ */
  if (!code && !tokenHash) {
    console.error('[auth/callback] Missing auth code and token_hash in callback URL');
    return errorRedirect('missing_code');
  }

  /* --- Verify the session ------------------------------------------ */
  const supabase = await createClient();
  let data: { user: import('@supabase/supabase-js').User | null } | null = null;
  let error: import('@supabase/supabase-js').AuthError | null = null;

  if (tokenHash && type) {
    // Flow 2: Direct OTP verification (server-generated magic links)
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    data = result.data;
    error = result.error;
  } else if (code) {
    // Flow 1: PKCE code exchange (OAuth, client-initiated flows)
    const result = await supabase.auth.exchangeCodeForSession(code);
    data = result.data;
    error = result.error;
  }

  if (error) {
    // Supabase returns specific messages for expired / already-used codes
    const isExpired =
      error.message?.toLowerCase().includes('expired') ||
      error.message?.toLowerCase().includes('already used') ||
      error.code === 'otp_expired';

    const errorCode = isExpired ? 'code_expired' : 'exchange_failed';

    console.error('[auth/callback] Verification failed', {
      flow: tokenHash ? 'token_hash' : 'code',
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
