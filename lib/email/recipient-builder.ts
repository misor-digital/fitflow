/**
 * Recipient Builder
 *
 * Populates email_campaign_recipients from various audience sources.
 * Recipients are snapshotted at campaign creation time — late changes
 * to the source data do not affect a running campaign.
 *
 * GDPR: Only consenting preorder holders are included (email_consent = true).
 * Expired conversion tokens are excluded.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { addRecipients } from '@/lib/data/email-recipients';
import type { EmailCampaignRecipientInsert, BoxType, SubscriptionStatus } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

/**
 * Maximum recipients to fetch per query.
 * Preorder / subscriber tables are unlikely to exceed this, but the guard
 * prevents runaway memory usage.
 */
const MAX_RECIPIENTS = 10_000;

// ---------------------------------------------------------------------------
// Preorder conversion recipients
// ---------------------------------------------------------------------------

/**
 * Build recipients from preorders that:
 *  - have conversion_status = 'pending'
 *  - have a non-null conversion_token
 *  - have a non-expired conversion_token_expires_at
 *  - have email_consent = true (GDPR)
 *
 * Each recipient gets per-recipient params containing the personalised
 * conversion URL, price info, and promo code.
 *
 * @returns The number of recipients inserted.
 */
export async function buildPreorderConversionRecipients(
  campaignId: string,
  filter?: { boxType?: BoxType },
): Promise<number> {
  let query = supabaseAdmin
    .from('preorders')
    .select(
      'id, full_name, email, box_type, conversion_token, promo_code, original_price_eur, final_price_eur, email_consent',
    )
    .eq('conversion_status', 'pending')
    .not('conversion_token', 'is', null)
    .gt('conversion_token_expires_at', new Date().toISOString())
    .eq('email_consent', true)
    .limit(MAX_RECIPIENTS);

  if (filter?.boxType) {
    query = query.eq('box_type', filter.boxType);
  }

  const { data: preorders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch preorders: ${error.message}`);
  }
  if (!preorders?.length) return 0;

  const recipients: EmailCampaignRecipientInsert[] = preorders.map((p) => ({
    campaign_id: campaignId,
    email: p.email.trim().toLowerCase(),
    full_name: p.full_name,
    preorder_id: p.id,
    params: {
      fullName: p.full_name,
      boxType: p.box_type,
      conversionUrl: `${SITE_URL}/order/convert?token=${p.conversion_token}`,
      promoCode: p.promo_code ?? null,
      originalPriceEur: p.original_price_eur ?? null,
      finalPriceEur: p.final_price_eur ?? null,
    },
  }));

  return addRecipients(recipients);
}

// ---------------------------------------------------------------------------
// Subscriber recipients
// ---------------------------------------------------------------------------

/**
 * Build recipients from active (or filtered) subscriptions.
 * Joins `user_profiles` via `auth.users` to get the subscriber's email and name.
 *
 * @returns The number of recipients inserted.
 */
export async function buildSubscriberRecipients(
  campaignId: string,
  filter?: { status?: SubscriptionStatus; boxType?: BoxType },
): Promise<number> {
  // Subscriptions don't store email directly — we need to join via user_id.
  // Supabase JS doesn't support cross-schema joins to auth.users, so we
  // fetch subscriptions first, then batch-fetch user info.

  let subQuery = supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, box_type, frequency, status')
    .limit(MAX_RECIPIENTS);

  // Default to active if no status filter
  if (filter?.status) {
    subQuery = subQuery.eq('status', filter.status);
  } else {
    subQuery = subQuery.eq('status', 'active');
  }

  if (filter?.boxType) {
    subQuery = subQuery.eq('box_type', filter.boxType);
  }

  const { data: subscriptions, error: subErr } = await subQuery;
  if (subErr) throw new Error(`Failed to fetch subscriptions: ${subErr.message}`);
  if (!subscriptions?.length) return 0;

  // Collect unique user IDs
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

  // Fetch user profiles for names
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name')
    .in('id', userIds);

  if (profErr) throw new Error(`Failed to fetch user profiles: ${profErr.message}`);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );

  // Fetch emails from auth.users via admin API
  // Supabase admin listUsers can fetch by IDs — but for simplicity
  // we fetch from the auth schema through the admin client's rpc or
  // by using the .auth.admin API.
  const emailMap = new Map<string, string>();
  // Batch fetch — Supabase admin API returns pages of 1000
  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);
    // Use auth admin to get user objects
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 50,
    });
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
      continue;
    }
    // Filter to only our batch IDs
    for (const user of authData.users) {
      if (batch.includes(user.id) && user.email) {
        emailMap.set(user.id, user.email);
      }
    }
  }

  const manageUrl = `${SITE_URL}/account/subscriptions`;

  const recipients: EmailCampaignRecipientInsert[] = [];
  for (const sub of subscriptions) {
    const email = emailMap.get(sub.user_id);
    if (!email) continue; // skip if we can't resolve email

    recipients.push({
      campaign_id: campaignId,
      email: email.trim().toLowerCase(),
      full_name: profileMap.get(sub.user_id) ?? null,
      params: {
        firstName: (profileMap.get(sub.user_id) ?? '').split(' ')[0] || null,
        boxType: sub.box_type,
        frequency: sub.frequency,
        manageUrl,
      },
    });
  }

  if (recipients.length === 0) return 0;
  return addRecipients(recipients);
}

// ---------------------------------------------------------------------------
// Customer recipients
// ---------------------------------------------------------------------------

/**
 * Build recipients from customers — either users who have placed orders or
 * all registered users depending on the filter.
 *
 * @returns The number of recipients inserted.
 */
export async function buildCustomerRecipients(
  campaignId: string,
  filter?: { hasOrdered?: boolean; lastOrderBefore?: string },
): Promise<number> {
  if (filter?.hasOrdered === true || filter?.lastOrderBefore) {
    // Customers who have placed at least one order
    let query = supabaseAdmin
      .from('orders')
      .select('customer_email, customer_full_name')
      .limit(MAX_RECIPIENTS);

    if (filter.lastOrderBefore) {
      query = query.lt('created_at', filter.lastOrderBefore);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    if (!orders?.length) return 0;

    // De-duplicate by email (lowercase)
    const seen = new Map<string, string>(); // email → full_name
    for (const o of orders) {
      const email = o.customer_email.trim().toLowerCase();
      if (!seen.has(email)) {
        seen.set(email, o.customer_full_name);
      }
    }

    const recipients: EmailCampaignRecipientInsert[] = Array.from(
      seen.entries(),
    ).map(([email, fullName]) => ({
      campaign_id: campaignId,
      email,
      full_name: fullName,
      params: {
        firstName: fullName.split(' ')[0] || null,
      },
    }));

    return addRecipients(recipients);
  }

  // All registered customers (user_profiles)
  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name')
    .limit(MAX_RECIPIENTS);

  if (error) throw new Error(`Failed to fetch user profiles: ${error.message}`);
  if (!profiles?.length) return 0;

  // Fetch emails from auth
  const emailMap = new Map<string, string>();
  const userIds = profiles.map((p) => p.id);

  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 50,
    });
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
      continue;
    }
    for (const user of authData.users) {
      if (batch.includes(user.id) && user.email) {
        emailMap.set(user.id, user.email);
      }
    }
  }

  const recipients: EmailCampaignRecipientInsert[] = [];
  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    recipients.push({
      campaign_id: campaignId,
      email: email.trim().toLowerCase(),
      full_name: profile.full_name,
      params: {
        firstName: profile.full_name.split(' ')[0] || null,
      },
    });
  }

  if (recipients.length === 0) return 0;
  return addRecipients(recipients);
}
