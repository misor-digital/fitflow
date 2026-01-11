/**
 * Auth Callback Route
 * 
 * Handles the OAuth callback from Supabase Auth.
 * This is used for email verification and password reset flows.
 */

import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/internal';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the next URL or internal page
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
