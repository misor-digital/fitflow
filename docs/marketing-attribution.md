# Marketing Campaign Attribution

This document describes the server-authoritative attribution system for tracking marketing campaigns to preorders.

## Overview

The attribution system enables deterministic tracking from marketing campaign emails to preorder conversions, independent of browser analytics (GA4, Meta Pixel). This provides:

- **Server-authoritative data**: DB is the source of truth, not analytics tools
- **Privacy-safe**: No PII in tokens, signed to prevent tampering
- **Resilient**: Works despite ad blockers and cross-device behavior
- **Idempotent**: Click records created lazily, safe for retries

## Architecture

### Data Flow

```
1. Campaign Created
   └── Campaign ID: abc-123, Name: "summer_25"

2. Email Sent to Recipient
   └── Recipient ID: def-456, Email: user@example.com
   └── CTA Link: /?mc={signed_token}&utm_source=email&utm_medium=campaign&utm_campaign=summer_25&promocode=FITFLOW10

3. User Clicks Email Link
   └── Browser loads home page
   └── Client stores attribution in sessionStorage (once, never overwritten)

4. User Completes Preorder (Step 4)
   └── Client sends attribution data with preorder request
   └── Server resolves mc token → campaign_id, recipient_id
   └── Server creates click record (if not exists)
   └── Server writes attribution to preorder

5. Preorder Created
   └── marketing_campaign_id: abc-123
   └── marketing_recipient_id: def-456
   └── marketing_click_id: ghi-789
   └── utm_source: email
   └── utm_medium: campaign
   └── utm_campaign: summer_25
```

### Database Schema

#### `marketing_clicks` Table

Tracks clicks from marketing campaign emails:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK to marketing_campaigns |
| recipient_id | UUID | FK to marketing_recipients (nullable) |
| click_token | TEXT | Unique signed token |
| utm_source | TEXT | Default: 'email' |
| utm_medium | TEXT | Default: 'campaign' |
| utm_campaign | TEXT | Campaign identifier |
| created_at | TIMESTAMPTZ | When click was recorded |

#### `preorders` Attribution Columns

| Column | Type | Description |
|--------|------|-------------|
| marketing_campaign_id | UUID | Campaign that led to preorder |
| marketing_recipient_id | UUID | Recipient who converted |
| marketing_click_id | UUID | Click record for this conversion |
| utm_source | TEXT | UTM source at preorder time |
| utm_medium | TEXT | UTM medium at preorder time |
| utm_campaign | TEXT | UTM campaign at preorder time |

## Click Token Format

Tokens are signed using HMAC-SHA256 to prevent tampering:

```
{base64url(payload)}.{signature}
```

Payload contains:
- `c`: Campaign ID
- `r`: Recipient ID (nullable)
- `t`: Timestamp
- `u`: UTM campaign identifier

Example token:
```
eyJjIjoiYWJjLTEyMyIsInIiOiJkZWYtNDU2IiwidCI6MTcwNDUwMDAwMDAwMCwidSI6InN1bW1lcl8yNSJ9.abc123signature
```

## Reporting Queries

### Orders per Campaign

```sql
SELECT 
  mc.name as campaign_name,
  COUNT(p.id) as total_orders,
  SUM(p.final_price_eur) as total_revenue
FROM preorders p
JOIN marketing_campaigns mc ON p.marketing_campaign_id = mc.id
GROUP BY mc.id, mc.name
ORDER BY total_orders DESC;
```

### Click → Preorder Conversion Rate

```sql
SELECT 
  mc.name as campaign_name,
  COUNT(DISTINCT mk.id) as total_clicks,
  COUNT(DISTINCT p.id) as conversions,
  ROUND(COUNT(DISTINCT p.id)::numeric / NULLIF(COUNT(DISTINCT mk.id), 0) * 100, 2) as conversion_rate
FROM marketing_campaigns mc
LEFT JOIN marketing_clicks mk ON mk.campaign_id = mc.id
LEFT JOIN preorders p ON p.marketing_click_id = mk.id
GROUP BY mc.id, mc.name
ORDER BY conversion_rate DESC;
```

### Revenue per Campaign with Recipient Details

```sql
SELECT 
  mc.name as campaign_name,
  mr.email as recipient_email,
  p.order_id,
  p.final_price_eur,
  p.created_at
FROM preorders p
JOIN marketing_campaigns mc ON p.marketing_campaign_id = mc.id
LEFT JOIN marketing_recipients mr ON p.marketing_recipient_id = mr.id
WHERE p.marketing_campaign_id IS NOT NULL
ORDER BY p.created_at DESC;
```

### Campaign Performance Summary

```sql
SELECT 
  mc.id,
  mc.name,
  mc.status,
  mc.sent_count,
  stats.total_clicks,
  stats.unique_recipients,
  stats.total_conversions,
  stats.total_revenue,
  stats.conversion_rate
FROM marketing_campaigns mc
CROSS JOIN LATERAL get_campaign_attribution_stats(mc.id) stats
ORDER BY mc.created_at DESC;
```

### Attribution by UTM Campaign

```sql
SELECT 
  utm_campaign,
  COUNT(*) as orders,
  SUM(final_price_eur) as revenue,
  AVG(final_price_eur) as avg_order_value
FROM preorders
WHERE utm_campaign IS NOT NULL
GROUP BY utm_campaign
ORDER BY revenue DESC;
```

## Implementation Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260106000000_add_marketing_attribution.sql` | Database schema |
| `lib/marketing/clickToken.ts` | Token generation and resolution |
| `lib/marketing/templates/discount.ts` | Email CTA with attribution |
| `app/api/preorder/route.ts` | Server-side attribution resolution |
| `store/formStore.ts` | Client-side attribution storage |
| `app/page.tsx` | Attribution capture from URL |
| `app/step-4/page.tsx` | Attribution sent with preorder |

## Key Design Decisions

1. **Token-based attribution** (not cookie-based): More resilient to cross-device, ad blockers
2. **Lazy click record creation**: Click record created on preorder, not on click (simpler, no click tracking endpoint needed)
3. **Signed tokens**: Prevents tampering, follows existing unsubscribe token pattern
4. **Best-effort attribution**: Never blocks preorder creation
5. **DB as source of truth**: Analytics tools observe, DB decides
6. **Write-once fields**: Attribution fields never updated after creation

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLICK_TOKEN_SECRET` | Secret for signing click tokens (falls back to `SUPABASE_SECRET_KEY`) |

## Testing Attribution

1. Create a test campaign in the internal marketing UI
2. Send a test email to yourself
3. Click the CTA link in the email
4. Complete a preorder
5. Check the preorder record for attribution fields:

```sql
SELECT 
  id, order_id, email,
  marketing_campaign_id,
  marketing_recipient_id,
  marketing_click_id,
  utm_source, utm_medium, utm_campaign
FROM preorders
ORDER BY created_at DESC
LIMIT 1;
```
