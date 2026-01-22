/**
 * API Route: Export Audit Logs
 * GET /api/staff/audit-logs/export - Export audit logs to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { exportAuditLogs } from '@/lib/supabase/auditService';

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
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'json';
    const actorType = searchParams.get('actorType') || undefined;
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    // Export audit logs
    const result = await exportAuditLogs(
      {
        actorType,
        action,
        resourceType,
        fromDate,
        toDate,
      },
      format
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return file download
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
