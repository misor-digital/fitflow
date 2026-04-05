import { NextRequest, NextResponse } from 'next/server';
import {
  sendMetaEvent,
  type MetaServerEvent,
  type MetaEventName,
} from '@/lib/analytics/metaCapi';

/**
 * POST /api/analytics/track
 *
 * Accepts a Meta Pixel event from the client and sends it to CAPI.
 * Body: { eventName, eventId, customData?, fbp?, fbc?, sourceUrl? }
 *
 * The route reads IP and User-Agent from request headers.
 * This is a fire-and-forget endpoint — always returns 200.
 */

const ALLOWED_EVENTS: MetaEventName[] = [
  'PageView',
  'ViewContent',
  'InitiateCheckout',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, eventId, customData, fbp, fbc, sourceUrl } = body;

    // Validate event name
    if (!eventName || !ALLOWED_EVENTS.includes(eventName)) {
      return NextResponse.json({ ok: true }); // Silently ignore
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ ok: true });
    }

    // Build user data from request headers
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    const event: MetaServerEvent = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: sourceUrl || request.headers.get('referer') || '',
      action_source: 'website',
      data_processing_options: [],
      user_data: {
        client_ip_address: clientIp,
        client_user_agent: userAgent,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
      },
      custom_data: customData || undefined,
    };

    // Fire and forget — don't await, don't block the response
    sendMetaEvent(event).catch((err) => {
      console.error('[analytics/track] CAPI error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail — analytics should not break the UX
    return NextResponse.json({ ok: true });
  }
}
