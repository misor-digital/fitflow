import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/preorder/link
 * Links all unlinked preorders matching the user's email to their account.
 * Returns the count of linked preorders.
 */
export async function POST(): Promise<NextResponse> {
  const session = await requireAuth();

  // Find unlinked preorders matching the user's verified email
  const { data: preorders, error: fetchError } = await supabaseAdmin
    .from('preorders')
    .select('id, order_id, box_type, created_at')
    .eq('email', session.email.toLowerCase())
    .is('user_id', null);

  if (fetchError) {
    console.error('Error fetching unlinked preorders:', fetchError);
    return NextResponse.json(
      { error: 'Грешка при търсене на поръчки' },
      { status: 500 }
    );
  }

  if (!preorders || preorders.length === 0) {
    return NextResponse.json({ linked: 0, preorders: [] });
  }

  // Link them all
  const preorderIds = preorders.map(p => p.id);
  const { error: updateError } = await supabaseAdmin
    .from('preorders')
    .update({ user_id: session.userId })
    .in('id', preorderIds);

  if (updateError) {
    console.error('Error linking preorders:', updateError);
    return NextResponse.json(
      { error: 'Грешка при свързване на поръчки' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    linked: preorders.length,
    preorders: preorders.map(p => ({
      id: p.id,
      orderId: p.order_id,
      boxType: p.box_type,
      createdAt: p.created_at,
    })),
  });
}

/**
 * GET /api/preorder/link
 * Check if the current user has unlinked preorders.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requireAuth();

  const { count, error } = await supabaseAdmin
    .from('preorders')
    .select('id', { count: 'exact', head: true })
    .eq('email', session.email.toLowerCase())
    .is('user_id', null);

  if (error) {
    console.error('Error checking unlinked preorders:', error);
    return NextResponse.json({ hasUnlinked: false, count: 0 });
  }

  return NextResponse.json({
    hasUnlinked: (count ?? 0) > 0,
    count: count ?? 0,
  });
}
