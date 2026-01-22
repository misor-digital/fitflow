/**
 * API Route: Export Subscribers
 * GET /api/staff/subscribers/export
 * Exports subscribers to CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { exportSubscribers } from '@/lib/supabase/subscriberService';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has marketing roles
    const hasPermission = await hasAnyRole(user.id, [
      'super_admin',
      'admin_ops',
      'marketing_manager',
      'marketing_operator'
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get status filter
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'subscribed' | 'unsubscribed' | 'all' | null;

    // Export subscribers
    const result = await exportSubscribers(status || 'all');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Log export action
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'staff',
      p_actor_id: user.id,
      p_actor_email: null,
      p_action: 'subscribers.exported',
      p_resource_type: 'newsletter_subscription',
      p_resource_id: null,
      p_metadata: { status: status || 'all' },
      p_ip_address: null,
      p_user_agent: null,
    } as any);

    // Return CSV file
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in subscribers export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
