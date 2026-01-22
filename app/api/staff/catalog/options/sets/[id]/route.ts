/**
 * API Route: Options Management by Set
 * GET /api/staff/catalog/options/sets/[id] - List options for a set
 * POST /api/staff/catalog/options/sets/[id] - Create new option
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { listOptions, createOption } from '@/lib/supabase/catalogService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: setId } = await params;
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

    const result = await listOptions(setId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, options: result.data });
  } catch (error) {
    console.error('Error listing options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: setId } = await params;
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
    const { value, label, priceModifier } = body;

    if (!value || !label || priceModifier === undefined) {
      return NextResponse.json(
        { error: 'Value, label, and price modifier are required' },
        { status: 400 }
      );
    }

    const result = await createOption(
      setId,
      { value: value.trim(), label: label.trim(), priceModifier },
      user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Option created successfully',
      option: result.data,
    });
  } catch (error) {
    console.error('Error creating option:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
