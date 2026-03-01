import { NextRequest, NextResponse } from 'next/server';
import { verifyConfirmToken } from '@/lib/order/confirm-token';
import { getOrderById, updateOrderStatus } from '@/lib/data';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');
    const orderId = searchParams.get('orderId');

    // 1. Validate params
    if (!token || !orderId) {
      return redirectWithStatus('invalid');
    }

    // 2. Get order
    const order = await getOrderById(orderId);
    if (!order) {
      return redirectWithStatus('not-found');
    }

    // 3. Verify token against order's email
    if (!verifyConfirmToken(token, orderId, order.customer_email)) {
      return redirectWithStatus('invalid');
    }

    // 4. Check status — idempotent
    if (order.status === 'delivered') {
      return redirectWithStatus('already');
    }

    if (order.status !== 'shipped') {
      return redirectWithStatus('invalid-status');
    }

    // 5. Confirm delivery
    await updateOrderStatus(
      orderId,
      'delivered',
      null, // No user ID — token-based confirmation
      'Потвърдено от клиента чрез имейл линк',
    );

    return redirectWithStatus('success');
  } catch (err) {
    console.error('Error confirming delivery via token:', err);
    return redirectWithStatus('error');
  }
}

function redirectWithStatus(status: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fitflow.bg';
  return NextResponse.redirect(
    `${baseUrl}/order/delivery-confirmed?status=${encodeURIComponent(status)}`,
  );
}
