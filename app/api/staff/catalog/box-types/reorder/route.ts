/**
 * API Route: Reorder Box Types
 * PUT /api/staff/catalog/box-types/reorder
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { reorderBoxTypes } from '@/lib/supabase/catalogService';

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await hasAnyRole(user.id, ['super_admin', 'admin_ops', 'catalog_manager']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json(
        { error: 'Order must be a non-empty array of IDs' },
        { status: 400 }
      );
    }

    const result = await reorderBoxTypes(order, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Box types reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering box types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
