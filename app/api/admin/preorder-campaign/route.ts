/**
 * Admin API — Preorder Conversion Campaign
 *
 * GET  /api/admin/preorder-campaign  — Preview eligible recipients
 * POST /api/admin/preorder-campaign  — Send (or dry-run) conversion emails
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  getEligiblePreorderRecipients,
  sendPreorderConversionEmails,
} from '@/lib/email/preorder-campaign';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask an email for admin preview: `jo***@gmail.com` */
function maskEmail(email: string): string {
  return email.slice(0, 2) + '***@' + email.split('@')[1];
}

// ---------------------------------------------------------------------------
// GET — Preview eligible recipients
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();

    const recipients = await getEligiblePreorderRecipients();

    const masked = recipients.map((r) => ({
      preorderId: r.preorderId,
      orderId: r.orderId,
      email: maskEmail(r.email),
      fullEmail: r.email,
      fullName: r.fullName,
      boxType: r.boxType,
      conversionUrl: r.conversionUrl,
      wantsPersonalization: r.wantsPersonalization,
      promoCode: r.promoCode,
      originalPriceEur: r.originalPriceEur,
      finalPriceEur: r.finalPriceEur,
      originalPriceBgn: r.originalPriceBgn,
      finalPriceBgn: r.finalPriceBgn,
    }));

    return NextResponse.json({ recipients: masked, total: recipients.length });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[preorder-campaign GET]', err);
    return NextResponse.json(
      { error: 'Възникна грешка при зареждане на получателите.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Send or dry-run conversion emails
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : true;
    const includeIds: string[] | undefined = Array.isArray(body.includeIds) ? body.includeIds : undefined;

    const result = await sendPreorderConversionEmails({ dryRun, includeIds });

    // Mask emails in the recipient list before returning
    const maskedRecipients = result.recipients.map((r) => ({
      ...r,
      email: maskEmail(r.email),
    }));

    return NextResponse.json({ ...result, recipients: maskedRecipients });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[preorder-campaign POST]', err);
    return NextResponse.json(
      { error: 'Възникна грешка при изпращането.' },
      { status: 500 },
    );
  }
}
