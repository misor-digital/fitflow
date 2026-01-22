/**
 * API Route: Search Audit Logs
 * GET /api/staff/audit-logs/search - Search audit logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { searchAuditLogs } from '@/lib/supabase/auditService';

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

    // Check permissions (super_admin, admin_ops)
    const hasPermission = await hasAnyRole(user.id, ['super_admin', 'admin_ops']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const actorType = searchParams.get('actorType') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    // Search audit logs
    const result = await searchAuditLogs(query, {
      actorType,
      resourceType,
      fromDate,
      toDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      logs: result.data,
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
