import { NextRequest, NextResponse } from 'next/server';
import {
  getOrdersNeedingDeliveryAction,
  recordReminderSent,
  updateOrderStatus,
  getSiteConfig,
} from '@/lib/data';
import { sendTransactionalEmail } from '@/lib/email/brevo/transactional';
import {
  generateDeliveryReminderEmail,
  generateDeliveryAutoConfirmedEmail,
} from '@/lib/email/templates';
import { buildConfirmUrl } from '@/lib/order/confirm-token';
import type { OrderNeedingAction } from '@/lib/data';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PROCESSING_TIME_MS = 50_000; // 50s — leave 10s buffer
const CONTACT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_URL || 'https://fitflow.bg/faqs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let remindersProcessed = 0;
  let autoConfirmed = 0;
  let errors = 0;

  try {
    // 2. Read configuration
    const delayDaysValue = await getSiteConfig(
      'DELIVERY_CONFIRMATION_DELAY_DAYS',
    );
    const delayDays = parseInt(delayDaysValue ?? '3', 10);

    // 3. Fetch orders needing action
    const ordersNeedingAction =
      await getOrdersNeedingDeliveryAction(delayDays);

    if (ordersNeedingAction.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders need delivery confirmation action.',
        remindersProcessed: 0,
        autoConfirmed: 0,
      });
    }

    console.log(
      `[delivery-cron] Processing ${ordersNeedingAction.length} orders`,
    );

    // 4. Process each order
    for (const item of ordersNeedingAction) {
      // Time guard
      if (Date.now() - startTime > MAX_PROCESSING_TIME_MS) {
        console.warn('[delivery-cron] Approaching timeout, stopping early.');
        break;
      }

      try {
        if (item.reminderCount >= 3) {
          // AUTO-CONFIRM: 3 reminders sent and 2 days have passed
          await handleAutoConfirm(item);
          autoConfirmed++;
        } else {
          // SEND REMINDER: next reminder number is reminderCount + 1
          await handleReminder(item, delayDays);
          remindersProcessed++;
        }
      } catch (err) {
        console.error(
          `[delivery-cron] Error processing order ${item.order.id}:`,
          err,
        );
        errors++;
      }
    }

    const result = {
      success: true,
      processed: ordersNeedingAction.length,
      remindersProcessed,
      autoConfirmed,
      errors,
    };

    console.log('[delivery-cron] Completed:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error('[delivery-cron] Fatal error:', err);
    return NextResponse.json(
      { error: 'Cron job failed.', details: String(err) },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleReminder(
  item: OrderNeedingAction,
  _delayDays: number,
): Promise<void> {
  const { order, reminderCount } = item;
  const nextReminderNumber = reminderCount + 1;
  const confirmUrl = buildConfirmUrl(order.id, order.customer_email);

  // Calculate auto-confirm date:
  // If this is reminder 3, auto-confirm in 2 days
  // If reminder 1 or 2, it's further out
  const remainingReminders = 3 - nextReminderNumber;
  const daysUntilAutoConfirm = remainingReminders * 2 + 2; // each remaining gap + 2 days after last
  const autoConfirmDate = new Date(
    Date.now() + daysUntilAutoConfirm * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Generate email
  const html = generateDeliveryReminderEmail({
    customerName: order.customer_full_name,
    orderNumber: order.order_number,
    shippedAt: order.shipped_at!,
    confirmUrl,
    reminderNumber: nextReminderNumber,
    autoConfirmDate,
    reportProblemUrl: CONTACT_URL,
  });

  // 2. Send email
  const emailResult = await sendTransactionalEmail({
    to: { email: order.customer_email, name: order.customer_full_name },
    subject: `Потвърдете доставката на поръчка ${order.order_number}`,
    htmlContent: html,
    category: 'delivery-reminder',
    relatedEntityType: 'order',
    relatedEntityId: order.id,
  });

  if (!emailResult.success) {
    console.error(
      `[delivery-cron] Email failed for order ${order.id}:`,
      emailResult.error,
    );
    // Still record the reminder — don't retry sending on next cron run
    // The email log tracks the failure separately
  }

  // 3. Record reminder sent (idempotent via UNIQUE constraint)
  await recordReminderSent(order.id, nextReminderNumber);

  console.log(
    `[delivery-cron] Sent reminder #${nextReminderNumber} for order ${order.order_number}`,
  );
}

async function handleAutoConfirm(item: OrderNeedingAction): Promise<void> {
  const { order } = item;

  // 1. Update status to delivered
  await updateOrderStatus(
    order.id,
    'delivered',
    null, // System action — no user ID
    'Автоматично потвърдена доставка (след 3 напомняния)',
  );

  // 2. Send notification email
  const html = generateDeliveryAutoConfirmedEmail({
    customerName: order.customer_full_name,
    orderNumber: order.order_number,
    confirmedAt: new Date().toISOString(),
    reportProblemUrl: CONTACT_URL,
  });

  const emailResult = await sendTransactionalEmail({
    to: { email: order.customer_email, name: order.customer_full_name },
    subject: `Поръчка ${order.order_number} е маркирана като доставена`,
    htmlContent: html,
    category: 'delivery-auto-confirmed',
    relatedEntityType: 'order',
    relatedEntityId: order.id,
  });

  if (!emailResult.success) {
    console.error(
      `[delivery-cron] Auto-confirm email failed for order ${order.id}:`,
      emailResult.error,
    );
  }

  console.log(`[delivery-cron] Auto-confirmed order ${order.order_number}`);
}
