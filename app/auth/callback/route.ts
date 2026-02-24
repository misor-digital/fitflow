import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncNewUser } from '@/lib/email/contact-sync';

/**
 * Handles the auth callback from Supabase (email confirmations, magic links, password reset).
 * Exchanges the auth code for a session and redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Fire-and-forget: Sync new user to Brevo contacts on first confirmation
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
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
