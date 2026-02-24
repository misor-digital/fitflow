/**
 * POST /api/admin/campaigns/:id/send-test — Send a test email to a specified address.
 *
 * Uses the campaign's template and global params to send a single test email.
 * The subject is prefixed with "[ТЕСТ]" to clearly identify it as a test send.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getCampaignById } from '@/lib/data/email-campaigns';
import { recordCampaignAction } from '@/lib/data/email-campaign-history';
import { sendTemplateEmail, sendEmail } from '@/lib/email/emailService';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const { email } = body as { email?: string };
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Моля, въведете имейл адрес (email).' },
        { status: 400 },
      );
    }

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Кампанията не е намерена.' },
        { status: 404 },
      );
    }

    // Use campaign-level params as test data
    const testParams = (campaign.params ?? {}) as Record<string, string | number | boolean | string[]>;
    const testSubject = `[ТЕСТ] ${campaign.subject}`;

    let result;
    if (campaign.template_id) {
      result = await sendTemplateEmail({
        to: [{ email, name: 'Test Recipient' }],
        templateId: campaign.template_id,
        params: testParams,
        subject: testSubject,
      });
    } else if (campaign.html_content) {
      result = await sendEmail({
        to: [{ email, name: 'Test Recipient' }],
        subject: testSubject,
        htmlContent: campaign.html_content,
        params: testParams as Record<string, string | number | boolean>,
      });
    } else {
      return NextResponse.json(
        { error: 'Кампанията няма конфигуриран шаблон или HTML съдържание.' },
        { status: 400 },
      );
    }

    // Audit log
    await recordCampaignAction({
      campaign_id: id,
      action: 'test_sent',
      changed_by: session.userId,
      metadata: { testEmail: email, success: result.success },
      notes: `Тестов имейл изпратен до ${email}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Грешка при изпращане: ${result.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[send-test POST]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
