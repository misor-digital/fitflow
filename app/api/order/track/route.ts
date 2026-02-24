/**
 * Order Tracking API Route
 * Public endpoint for guest order lookup by email + order number.
 *
 * GET /api/order/track?email=...&order=FF-XXXXXX-XXXXXX
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrderByNumberAndEmail, getOrderStatusHistory, getBoxTypeNames } from '@/lib/data';
import { eurToBgn } from '@/lib/data';
import { isValidEmail } from '@/lib/catalog';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { ORDER_STATUS_LABELS } from '@/lib/order';
import type { OrderTrackingData } from '@/lib/order';

const ORDER_NUMBER_REGEX = /^FF-\d{6}-[A-Z0-9]{6}$/;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // 1. Rate limiting: 5 requests per 15 minutes per IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`order_track:${ip}`, 5, 900);

    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Твърде много опити. Моля, опитайте след 15 минути.' },
        { status: 429 },
      );
    }

    // 2. Validate inputs
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const orderNumber = searchParams.get('order');

    if (!email || !orderNumber) {
      return NextResponse.json(
        { error: 'Моля, въведете валидни данни.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Моля, въведете валидни данни.' },
        { status: 400 },
      );
    }

    if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
      return NextResponse.json(
        { error: 'Моля, въведете валидни данни.' },
        { status: 400 },
      );
    }

    // 3. Lookup order by number + email combo
    const order = await getOrderByNumberAndEmail(orderNumber, email);

    if (!order) {
      return NextResponse.json(
        { error: 'Поръчка с тези данни не е намерена.' },
        { status: 404 },
      );
    }

    // 4. Enrich data
    const [statusHistory, boxTypeNames] = await Promise.all([
      getOrderStatusHistory(order.id),
      getBoxTypeNames(),
    ]);

    const finalPriceBgn = order.final_price_eur
      ? await eurToBgn(order.final_price_eur)
      : null;

    // 5. Build safe response — no internal IDs, no email
    const trackingData: OrderTrackingData & { statusLabel: string; boxTypeName: string; finalPriceBgn: number | null } = {
      orderNumber: order.order_number,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      customerFullName: order.customer_full_name,
      boxType: order.box_type,
      boxTypeName: boxTypeNames[order.box_type] ?? order.box_type,
      shippingAddress: order.shipping_address,
      finalPriceEur: order.final_price_eur,
      finalPriceBgn,
      createdAt: order.created_at,
      statusHistory: statusHistory.map((h) => ({
        fromStatus: h.from_status,
        toStatus: h.to_status,
        notes: h.notes,
        createdAt: h.created_at,
      })),
    };

    return NextResponse.json({ order: trackingData });
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { error: 'Възникна грешка. Моля, опитайте отново.' },
      { status: 500 },
    );
  }
}
