/**
 * API Route: Order Analytics
 * GET /api/staff/analytics/orders - Get order statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { getOrderStats, getTopProducts, getCustomerLifetimeValue } from '@/lib/supabase/analyticsService';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await hasAnyRole(user.id, ['super_admin', 'admin_ops', 'finance']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';

    let result;
    
    switch (type) {
      case 'stats':
        result = await getOrderStats();
        break;
      case 'top-products':
        const limit = parseInt(searchParams.get('limit') || '10');
        result = await getTopProducts(limit);
        break;
      case 'clv':
        result = await getCustomerLifetimeValue();
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error getting order analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
