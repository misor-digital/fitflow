import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET(): Promise<NextResponse> {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    full_name: session.profile.full_name,
    user_type: session.profile.user_type,
    staff_role: session.profile.staff_role,
    avatar_url: session.profile.avatar_url,
    is_subscriber: session.profile.is_subscriber,
  });
}
