/**
 * Brevo Webhook Endpoint
 *
 * Receives email event callbacks from Brevo and updates email_send_log
 * with delivery status information.
 *
 * Webhook URL to configure in Brevo:
 *   POST {SITE_URL}/api/webhooks/brevo?secret={BREVO_WEBHOOK_SECRET}
 *
 * Supported events: delivered, soft_bounce, hard_bounce, opened, clicked,
 * spam, unsubscribed, blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateEmailLogFromWebhook } from '@/lib/data/email-log';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recordUnsubscribe } from '@/lib/email/unsubscribe';
import type { EmailRecipientStatusEnum } from '@/lib/supabase/types';

const WEBHOOK_SECRET = process.env.BREVO_WEBHOOK_SECRET;

interface BrevoWebhookPayload {
  event:
    | 'delivered'
    | 'soft_bounce'
    | 'hard_bounce'
    | 'opened'
    | 'clicked'
    | 'spam'
    | 'unsubscribed'
    | 'blocked';
  email: string;
  'message-id': string;
  date: string;
  ts_epoch: number;
  subject?: string;
  tag?: string;
  reason?: string;
  link?: string;
}

/** Map Brevo webhook event to email_campaign_recipients status */
function mapEventToRecipientStatus(event: string): EmailRecipientStatusEnum | null {
  switch (event) {
    case 'delivered':
      return 'delivered';
    case 'opened':
      return 'opened';
    case 'clicked':
      return 'clicked';
    case 'soft_bounce':
    case 'hard_bounce':
      return 'bounced';
    case 'spam':
    case 'blocked':
      return 'failed';
    default:
      return null;
  }
}

/**
 * Status priority for idempotent updates.
 * Higher number = more advanced state — never go backwards.
 */
const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  failed: 5,
  skipped: 0,
};

async function processWebhookEvent(payload: BrevoWebhookPayload): Promise<void> {
  const messageId = payload['message-id'];
  if (!messageId) return;

  try {
    // Update email_send_log with webhook data
    const { campaignId, recipientEmail } = await updateEmailLogFromWebhook(
      messageId,
      payload.event,
      {
        date: payload.date,
        reason: payload.reason,
        link: payload.link,
      },
    );

    // If this email belongs to a campaign, update the campaign recipient status too
    if (campaignId && recipientEmail) {
      const recipientStatus = mapEventToRecipientStatus(payload.event);
      if (recipientStatus) {
        // Fetch current recipient status for idempotent update
        const { data: recipient } = await supabaseAdmin
          .from('email_campaign_recipients')
          .select('id, status')
          .eq('campaign_id', campaignId)
          .eq('email', recipientEmail)
          .maybeSingle();

        if (recipient) {
          const currentPriority = STATUS_PRIORITY[recipient.status] ?? 0;
          const newPriority = STATUS_PRIORITY[recipientStatus] ?? 0;

          // Only update if the new status is more advanced
          if (newPriority >= currentPriority) {
            await supabaseAdmin
              .from('email_campaign_recipients')
              .update({ status: recipientStatus })
              .eq('id', recipient.id);
          }
        }
      }
    }

    // Handle unsubscribe events — record in local unsubscribe list
    if (payload.event === 'unsubscribed' && payload.email) {
      await recordUnsubscribe(
        payload.email,
        'brevo',
        campaignId ?? undefined,
        payload.reason,
      );
    }
  } catch (err) {
    console.error(`Error processing webhook event ${payload.event} for ${messageId}:`, err);
    // Don't throw — process remaining events
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify webhook secret
  if (!WEBHOOK_SECRET) {
    console.error('BREVO_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured. Set BREVO_WEBHOOK_SECRET environment variable.' },
      { status: 401 },
    );
  }

  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid webhook secret.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Brevo may send a single event or an array of events
    const events: BrevoWebhookPayload[] = Array.isArray(body) ? body : [body];

    // Process all events (don't fail on individual event errors)
    await Promise.allSettled(events.map(processWebhookEvent));

    return NextResponse.json({ success: true, processed: events.length });
  } catch (err) {
    console.error('Error processing Brevo webhook:', err);
    // Return 200 to prevent Brevo from retrying malformed payloads
    return NextResponse.json({ success: false, error: 'Failed to parse webhook payload.' }, { status: 200 });
  }
}
