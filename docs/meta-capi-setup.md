# Meta Conversions API (CAPI) Setup

This document explains how to set up and configure Meta Conversions API for server-side event tracking.

## Overview

Meta CAPI sends events directly from the server to Meta, providing:
- **Better data accuracy** - Not blocked by ad blockers or browser privacy features
- **Improved attribution** - Server-side events are more reliable
- **Deduplication** - Events can be deduplicated with browser pixel using `event_id`

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Meta Pixel ID (same as browser pixel)
META_PIXEL_ID=your_pixel_id_here

# Meta Conversions API Access Token
# Generate this in Meta Events Manager > Settings > Conversions API
META_CAPI_ACCESS_TOKEN=your_access_token_here
```

## How to Get Your Access Token

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Select your Pixel
3. Go to **Settings** tab
4. Scroll to **Conversions API** section
5. Click **Generate access token**
6. Copy the token and add it to your environment variables

## Events Tracked via CAPI

Currently, the following events are sent via CAPI:

| Event | Trigger | Location |
|-------|---------|----------|
| `Lead` | Successful order submission | `/api/order` |

## Event Deduplication

To prevent duplicate events (browser + server), both should use the same `event_id`:

1. Generate an `event_id` on the client
2. Send it with the form submission
3. Use the same ID for both browser pixel and CAPI

### Example Implementation

```typescript
// Client-side (step-4/page.tsx)
import { generateEventId } from '@/lib/analytics';

const eventId = generateEventId();

// Send to API
await fetch('/api/order', {
  method: 'POST',
  body: JSON.stringify({
    ...formData,
    eventId, // Include for deduplication
    fbc: getCookie('_fbc'), // Facebook click ID
    fbp: getCookie('_fbp'), // Facebook browser ID
  }),
});

// Also fire browser pixel with same event_id
fbq('track', 'Lead', {}, { eventID: eventId });
```

## User Data Hashing

Meta requires certain user data fields to be hashed with SHA256:
- Email (`em`)
- Phone (`ph`)
- First name (`fn`)
- Last name (`ln`)
- City (`ct`)
- State (`st`)
- Zip code (`zp`)
- Country (`country`)

Use the `hashForMeta()` function:

```typescript
import { hashForMeta } from '@/lib/analytics';

const hashedEmail = await hashForMeta('user@example.com');
// Returns: SHA256 hash of lowercase, trimmed email
```

## Testing

### Test Events in Events Manager

1. Go to Meta Events Manager
2. Select your Pixel
3. Go to **Test Events** tab
4. Copy your Test Event Code
5. Add to your request:

```typescript
const response = await fetch(
  `${META_CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}&test_event_code=TEST12345`,
  // ...
);
```

### Verify Events

1. Submit a test order
2. Check Events Manager > Test Events
3. Verify the Lead event appears with correct data

## Troubleshooting

### Events Not Appearing

1. Check environment variables are set correctly
2. Verify access token hasn't expired
3. Check server logs for CAPI errors
4. Ensure Pixel ID matches your Events Manager

### Duplicate Events

1. Ensure `event_id` is the same for browser and server events
2. Check that deduplication window (48 hours) hasn't passed

### Low Match Rate

Improve match rate by including more user data:
- `fbc` - Facebook click ID from `_fbc` cookie
- `fbp` - Facebook browser ID from `_fbp` cookie
- `client_ip_address` - User's IP address
- `client_user_agent` - User's browser user agent

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Browser Pixel  │     │   Server CAPI   │
│  (Client-side)  │     │  (Server-side)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  event_id: "abc123"   │  event_id: "abc123"
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  Meta Events    │
            │  (Deduplicated) │
            └─────────────────┘
```

## Files

- `lib/analytics/metaCapi.ts` - CAPI utility functions
- `lib/analytics/index.ts` - Exports
- `app/api/order/route.ts` - Lead event integration
