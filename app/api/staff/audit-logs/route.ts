/**
 * API Route: Audit Logs
 * GET /api/staff/audit-logs - List audit logs with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { listAuditLogs } from '@/lib/supabase/auditService';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const actorType = searchParams.get('actorType') || undefined;
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    // Get audit logs
    const result = await listAuditLogs(page, limit, {
      actorType,
      action,
      resourceType,
      fromDate,
      toDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
