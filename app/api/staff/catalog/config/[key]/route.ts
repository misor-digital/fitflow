/**
 * API Route: Site Configuration Update
 * PUT /api/staff/catalog/config/[key] - Update configuration value
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { updateSiteConfig } from '@/lib/supabase/catalogService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
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
    const { value } = body;

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    const result = await updateSiteConfig(key, value.toString(), user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: result.data,
    });
  } catch (error) {
    console.error('Error updating site config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
