/**
 * Admin API — Order-to-Subscription Conversion Campaign
 *
 * GET  /api/admin/order-subscription-campaign  — Preview eligible recipients
 * POST /api/admin/order-subscription-campaign  — Send (or dry-run) conversion emails
 */

import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import {
  getEligibleOrderConversionRecipients,
  sendOrderConversionEmails,
} from '@/lib/email/order-subscription-campaign';
import { validatePromoCode } from '@/lib/data/promo';

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

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || undefined;

    const recipients = await getEligibleOrderConversionRecipients(cycleId);

    const masked = recipients.map((r) => ({
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      email: maskEmail(r.email),
      fullEmail: r.email,
      fullName: r.fullName,
      boxType: r.boxType,
      boxName: r.boxName,
      conversionUrl: r.conversionUrl,
      wantsPersonalization: r.wantsPersonalization,
      promoCode: r.promoCode,
      originalPriceEur: r.originalPriceEur,
      finalPriceEur: r.finalPriceEur,
      originalPriceBgn: r.originalPriceBgn,
      finalPriceBgn: r.finalPriceBgn,
    }));

    return NextResponse.json({ recipients: masked, count: recipients.length });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[order-subscription-campaign GET]', err);
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

    const includeIds: string[] | undefined = Array.isArray(body.includeIds)
      ? body.includeIds
      : undefined;

    if (includeIds !== undefined && includeIds.length === 0) {
      return NextResponse.json(
        { error: 'includeIds не може да е празен масив.' },
        { status: 400 },
      );
    }

    const campaignPromoCode = typeof body.campaignPromoCode === 'string'
      ? body.campaignPromoCode.trim()
      : null;

    if (body.campaignPromoCode !== undefined && !campaignPromoCode) {
      return NextResponse.json(
        { error: 'campaignPromoCode не може да е празен.' },
        { status: 400 },
      );
    }

    // Validate promo code exists and is active
    if (campaignPromoCode) {
      const promo = await validatePromoCode(campaignPromoCode);
      if (!promo) {
        return NextResponse.json(
          { error: 'Невалиден или неактивен промо код.' },
          { status: 400 },
        );
      }
    }

    const result = await sendOrderConversionEmails({
      dryRun,
      includeIds,
      campaignPromoCode,
    });

    // Mask emails in the recipient list before returning
    const maskedRecipients = result.recipients.map((r) => ({
      ...r,
      email: maskEmail(r.email),
    }));

    return NextResponse.json({ success: true, result: { ...result, recipients: maskedRecipients } });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }

    console.error('[order-subscription-campaign POST]', err);
    return NextResponse.json(
      { error: 'Възникна грешка при изпращането.' },
      { status: 500 },
    );
  }
}
