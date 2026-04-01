/**
 * Order-to-Subscription Campaign - Recipient Query
 *
 * Server-only module that queries eligible one-time orders and returns
 * structured recipient data for the subscription conversion email campaign.
 */

import 'server-only';

import { getEligibleOrdersForSubscription, getAllCycleOrdersForCampaign } from '@/lib/data/order-subscription-conversion';
import { eurToBgn } from '@/lib/data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable box type labels (Bulgarian) */
const BOX_TYPE_LABELS: Record<string, string> = {
  'onetime-standard': 'Стандартна',
  'onetime-premium': 'Премиум',
  'monthly-standard': 'Стандартна',
  'monthly-premium': 'Премиум',
  'monthly-premium-monthly': 'Премиум (месечна)',
  'monthly-premium-seasonal': 'Премиум (сезонна)',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderConversionRecipient {
  orderId: string;
  orderNumber: string;
  email: string;
  maskedEmail: string;
  fullName: string;
  phone: string | null;
  userId: string | null;
  hasAccount: boolean;
  boxType: string;
  boxName: string;
  wantsPersonalization: boolean;
  sports: string[] | null;
  colors: string[] | null;
  flavors: string[] | null;
  dietary: string[] | null;
  sizeUpper: string | null;
  sizeLower: string | null;
  originalPriceEur: number;
  finalPriceEur: number;
  originalPriceBgn: number;
  finalPriceBgn: number;
  promoCode: string | null;
  conversionUrl: string;
  subscriptionConversionToken: string | null;
  conversionStatus: 'none' | 'sent' | 'converted';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask an email for admin preview: `jo***@gmail.com` */
function maskEmail(email: string): string {
  return email.slice(0, 2) + '***@' + email.split('@')[1];
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch orders eligible for the subscription conversion campaign email.
 *
 * Maps each eligible order to an `OrderConversionRecipient` with:
 * - Masked email for admin previews
 * - Bulgarian box label
 * - EUR → BGN price conversion
 * - Empty conversionUrl (tokens are generated in the send step)
 */
export async function getEligibleOrderConversionRecipients(
  cycleId?: string,
): Promise<OrderConversionRecipient[]> {
  const orders = await getEligibleOrdersForSubscription(cycleId);

  if (!orders.length) return [];

  const recipients: OrderConversionRecipient[] = await Promise.all(
    orders.map(async (o) => {
      const originalEur = o.original_price_eur ?? 0;
      const finalEur = o.final_price_eur ?? 0;
      const originalBgn = await eurToBgn(originalEur);
      const finalBgn = await eurToBgn(finalEur);
      const email = o.customer_email.trim().toLowerCase();

      return {
        orderId: o.id,
        orderNumber: o.order_number,
        email,
        maskedEmail: maskEmail(email),
        fullName: o.customer_full_name,
        phone: o.customer_phone ?? null,
        userId: o.user_id ?? null,
        hasAccount: o.hasAccount,
        boxType: o.box_type,
        boxName: BOX_TYPE_LABELS[o.box_type] ?? o.box_type,
        wantsPersonalization: o.wants_personalization ?? false,
        sports: o.sports ?? null,
        colors: o.colors ?? null,
        flavors: o.flavors ?? null,
        dietary: o.dietary ?? null,
        sizeUpper: o.size_upper ?? null,
        sizeLower: o.size_lower ?? null,
        originalPriceEur: originalEur,
        finalPriceEur: finalEur,
        originalPriceBgn: originalBgn,
        finalPriceBgn: finalBgn,
        promoCode: o.promo_code ?? null,
        conversionUrl: '',
        subscriptionConversionToken: o.subscription_conversion_token ?? null,
        conversionStatus: resolveConversionStatus(o.subscription_conversion_status),
      };
    }),
  );

  return recipients;
}

// ---------------------------------------------------------------------------
// Campaign Overview Query (includes converted orders)
// ---------------------------------------------------------------------------

/**
 * Fetch ALL one-time orders for a cycle - including already-converted ones.
 * Used by the admin campaign page for full visibility and accurate stats.
 */
export async function getAllCampaignRecipients(
  cycleId?: string,
): Promise<OrderConversionRecipient[]> {
  const orders = await getAllCycleOrdersForCampaign(cycleId);

  if (!orders.length) return [];

  const recipients: OrderConversionRecipient[] = await Promise.all(
    orders.map(async (o) => {
      const originalEur = o.original_price_eur ?? 0;
      const finalEur = o.final_price_eur ?? 0;
      const originalBgn = await eurToBgn(originalEur);
      const finalBgn = await eurToBgn(finalEur);
      const email = o.customer_email.trim().toLowerCase();

      return {
        orderId: o.id,
        orderNumber: o.order_number,
        email,
        maskedEmail: maskEmail(email),
        fullName: o.customer_full_name,
        phone: o.customer_phone ?? null,
        userId: o.user_id ?? null,
        hasAccount: o.hasAccount,
        boxType: o.box_type,
        boxName: BOX_TYPE_LABELS[o.box_type] ?? o.box_type,
        wantsPersonalization: o.wants_personalization ?? false,
        sports: o.sports ?? null,
        colors: o.colors ?? null,
        flavors: o.flavors ?? null,
        dietary: o.dietary ?? null,
        sizeUpper: o.size_upper ?? null,
        sizeLower: o.size_lower ?? null,
        originalPriceEur: originalEur,
        finalPriceEur: finalEur,
        originalPriceBgn: originalBgn,
        finalPriceBgn: finalBgn,
        promoCode: o.promo_code ?? null,
        conversionUrl: '',
        subscriptionConversionToken: o.subscription_conversion_token ?? null,
        conversionStatus: resolveConversionStatus(o.subscription_conversion_status),
      };
    }),
  );

  return recipients;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveConversionStatus(
  dbStatus: string | null,
): 'none' | 'sent' | 'converted' {
  if (dbStatus === 'converted') return 'converted';
  if (dbStatus === 'pending') return 'sent';
  return 'none';
}
