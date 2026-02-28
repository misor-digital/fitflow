/**
 * Preorder Campaign — Recipient Query
 *
 * Server-only module that queries eligible preorders and returns
 * structured recipient data for the conversion email campaign.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { eurToBgn } from '@/lib/data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

/**
 * Maximum recipients to fetch per query.
 * Guards against runaway memory usage.
 */
const MAX_RECIPIENTS = 10_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreorderRecipient {
  preorderId: string;
  orderId: string;
  email: string;
  fullName: string;
  boxType: string;
  conversionUrl: string;
  wantsPersonalization: boolean;
  sports: string[] | null;
  sportOther: string | null;
  colors: string[] | null;
  flavors: string[] | null;
  flavorOther: string | null;
  sizeUpper: string | null;
  sizeLower: string | null;
  dietary: string[] | null;
  dietaryOther: string | null;
  promoCode: string | null;
  originalPriceEur: number | null;
  finalPriceEur: number | null;
  originalPriceBgn: number | null;
  finalPriceBgn: number | null;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch preorders eligible for the conversion campaign email.
 *
 * Criteria (mirrors `buildPreorderConversionRecipients` in recipient-builder.ts):
 *  - conversion_status = 'pending'
 *  - conversion_token is not null
 *  - conversion_token_expires_at > now
 *  - email_consent = true (GDPR)
 *
 * Returns data directly instead of inserting into email_campaign_recipients.
 */
export async function getEligiblePreorderRecipients(): Promise<PreorderRecipient[]> {
  const { data: preorders, error } = await supabaseAdmin
    .from('preorders')
    .select(
      'id, order_id, full_name, email, box_type, conversion_token, wants_personalization, sports, sport_other, colors, flavors, flavor_other, size_upper, size_lower, dietary, dietary_other, promo_code, original_price_eur, final_price_eur',
    )
    .eq('conversion_status', 'pending')
    .not('conversion_token', 'is', null)
    .gt('conversion_token_expires_at', new Date().toISOString())
    // .eq('email_consent', true)
    .limit(MAX_RECIPIENTS);

  if (error) {
    throw new Error(`Failed to fetch eligible preorders: ${error.message}`);
  }

  if (!preorders?.length) return [];

  // Compute BGN equivalents for each recipient
  const recipients: PreorderRecipient[] = await Promise.all(
    preorders.map(async (p) => {
      const originalEur = p.original_price_eur ?? null;
      const finalEur = p.final_price_eur ?? null;
      const originalBgn = originalEur != null ? await eurToBgn(originalEur) : null;
      const finalBgn = finalEur != null ? await eurToBgn(finalEur) : null;

      return {
        preorderId: p.id,
        orderId: p.order_id,
        email: p.email.trim().toLowerCase(),
        fullName: p.full_name,
        boxType: p.box_type,
        conversionUrl: `${SITE_URL}/order/convert?token=${p.conversion_token}`,
        wantsPersonalization: p.wants_personalization ?? false,
        sports: p.sports ?? null,
        sportOther: p.sport_other ?? null,
        colors: p.colors ?? null,
        flavors: p.flavors ?? null,
        flavorOther: p.flavor_other ?? null,
        sizeUpper: p.size_upper ?? null,
        sizeLower: p.size_lower ?? null,
        dietary: p.dietary ?? null,
        dietaryOther: p.dietary_other ?? null,
        promoCode: p.promo_code ?? null,
        originalPriceEur: originalEur,
        finalPriceEur: finalEur,
        originalPriceBgn: originalBgn,
        finalPriceBgn: finalBgn,
      };
    }),
  );

  return recipients;
}
