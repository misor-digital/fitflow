/**
 * Staff User Activity API Route
 * GET - Get current user's activity logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // Get staff user to find their email
    const { data: staffUser } = await supabase
      .from('staff_users')
      .select('email')
      .eq('user_id', user.id)
      .single();
    
    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }
    
    // Get audit logs for this user
    const { data: logs, error: logsError, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('actor_type', 'staff')
      .eq('actor_email', staffUser.email)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
