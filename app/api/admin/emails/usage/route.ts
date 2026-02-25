/**
 * Admin Email Usage Stats API
 *
 * GET /api/admin/emails/usage?month=2026-02
 * Returns monthly usage stats + delivery/open/click rates.
 * Protected by requireAdmin().
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getEmailStats } from '@/lib/data/email-log';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailMonthlyUsageRow } from '@/lib/supabase/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    // Default to current month (YYYY-MM)
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Parse month to get date range
    const [year, month] = monthParam.split('-').map(Number);
    const monthDate = `${monthParam}-01`; // DATE column needs YYYY-MM-01
    const dateFrom = `${monthParam}-01T00:00:00.000Z`;
    const lastDay = new Date(year, month, 0).getDate();
    const dateTo = `${monthParam}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    // Fetch usage row for the requested month
    const { data: usageRow } = await supabaseAdmin
      .from('email_monthly_usage')
      .select('*')
      .eq('month', monthDate)
      .maybeSingle();

    // Fetch previous month's usage for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

    const { data: prevUsageRow } = await supabaseAdmin
      .from('email_monthly_usage')
      .select('*')
      .eq('month', prevMonthStr)
      .maybeSingle();

    // Fetch detailed stats from email_send_log
    const stats = await getEmailStats(dateFrom, dateTo);

    // Calculate rates
    const deliveryRate = stats.total > 0
      ? Math.round((stats.delivered / stats.total) * 1000) / 10
      : 0;
    const openRate = stats.delivered > 0
      ? Math.round((stats.opened / stats.delivered) * 1000) / 10
      : 0;
    const clickRate = stats.opened > 0
      ? Math.round((stats.clicked / stats.opened) * 1000) / 10
      : 0;
    const bounceRate = stats.total > 0
      ? Math.round((stats.bounced / stats.total) * 1000) / 10
      : 0;
    const spamRate = stats.total > 0
      ? Math.round((stats.spam / stats.total) * 1000) / 10
      : 0;

    const usage: EmailMonthlyUsageRow | null = usageRow;
    const previousMonth: EmailMonthlyUsageRow | null = prevUsageRow;

    return NextResponse.json({
      month: monthParam,
      sent: usage?.total_sent ?? stats.total,
      limit: usage?.monthly_limit ?? 5000,
      transactionalSent: usage?.transactional_sent ?? stats.transactional,
      campaignSent: usage?.campaign_sent ?? stats.campaign,
      previousMonthSent: previousMonth?.total_sent ?? 0,
      stats,
      deliveryRate,
      openRate,
      clickRate,
      bounceRate,
      spamRate,
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Error in GET /api/admin/emails/usage:', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
