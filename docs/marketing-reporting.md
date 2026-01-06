# Marketing Campaign Reporting Guide

This document explains how to use the campaign reporting features in the internal marketing UI.

## Overview

The reporting system provides insights into campaign performance, including:
- Send statistics (sent, failed, skipped)
- Click tracking
- Lead (preorder) attribution
- Conversion rates
- Revenue tracking

## Accessing Reports

Reports are available in the internal marketing UI at `/internal/marketing/campaigns/[id]`.

**Important**: Reporting is only available in non-production environments (feat/dev/stage).

## Campaign Performance Metrics

### Summary Statistics

For each campaign, the following metrics are tracked:

| Metric | Description |
|--------|-------------|
| **Total Eligible** | Number of recipients matching the campaign filter |
| **Sent** | Emails successfully delivered to the email provider |
| **Failed** | Emails that failed to send (provider error) |
| **Skipped** | Emails skipped (unsubscribed, dry-run, etc.) |
| **Clicks** | Total click events on campaign links |
| **Unique Clickers** | Number of distinct recipients who clicked |
| **Leads** | Preorders attributed to this campaign |
| **Revenue** | Total revenue from attributed preorders |

### Conversion Rates

Two key conversion rates are calculated:

1. **Sent → Lead Rate**: `(leads / sent) × 100`
   - Shows overall campaign effectiveness
   - Typical range: 1-5% for marketing campaigns

2. **Click → Lead Rate**: `(leads / unique_clickers) × 100`
   - Shows landing page/offer effectiveness
   - Typical range: 10-30% for engaged users

### Time Window

Reports show the campaign period:
- **Start**: When the campaign started sending (`scheduled_start_at`)
- **End**: When completed, or current time if still active

## Breakdowns

### By Box Type

Shows lead distribution across different box types:
- Box type name
- Number of leads
- Revenue generated

Useful for understanding which products resonate with campaign audiences.

### By Promo Usage

Shows lead distribution by promo code usage:
- With promo code: leads who used a discount
- Without promo code: leads who paid full price
- Average discount percentage

Useful for measuring promo code effectiveness.

## How Attribution Works

### Click-Based Attribution

1. Campaign emails contain tracked links with a signed click token
2. When a recipient clicks, a `marketing_clicks` record is created
3. The click token is stored in the user's session/URL
4. When a preorder is created, the click token is resolved
5. The preorder is linked to the campaign via `marketing_campaign_id`

### Attribution Fields on Preorders

| Field | Description |
|-------|-------------|
| `marketing_campaign_id` | UUID of the attributed campaign |
| `marketing_recipient_id` | UUID of the recipient record |
| `marketing_click_id` | UUID of the click event |
| `utm_source` | UTM source parameter |
| `utm_medium` | UTM medium parameter |
| `utm_campaign` | UTM campaign parameter |

## Viewing Reports

### Campaign Detail Page

1. Navigate to `/internal/marketing/campaigns`
2. Click on a campaign to view details
3. Click "Show Reporting" to expand the reporting section

### Report Sections

1. **Time Window**: Campaign period display
2. **Summary Stats**: Grid of key metrics
3. **Conversion Rates**: Visual cards showing rates
4. **Breakdowns**: Box type and promo usage tables
5. **Follow-Up Campaigns**: List of related follow-ups

## API Endpoint

Reports can also be fetched programmatically:

```
GET /api/marketing/campaigns/[id]/reporting
```

Response:
```json
{
  "success": true,
  "reporting": {
    "stats": {
      "totalEligible": 100,
      "sent": 95,
      "failed": 2,
      "skipped": 3,
      "clicks": 45,
      "uniqueClickers": 30,
      "leads": 5,
      "revenue": 250.00,
      "sentToLeadRate": 5.26,
      "clickToLeadRate": 16.67,
      "timeWindow": {
        "start": "2026-01-05T10:00:00Z",
        "end": "2026-01-06T10:00:00Z"
      }
    },
    "breakdowns": {
      "byBoxType": [...],
      "byPromo": [...]
    },
    "followUps": [...]
  }
}
```

## Best Practices

### Interpreting Results

1. **Low sent → lead rate?**
   - Check email open rates (if available from provider)
   - Review subject line and preview text
   - Consider audience targeting

2. **High clicks but low conversions?**
   - Review landing page experience
   - Check offer clarity
   - Verify promo code is working

3. **High failed count?**
   - Check for invalid email addresses
   - Review bounce reports
   - Consider list hygiene

### Data Accuracy

- Attribution is based on click tokens, not GA/Pixel
- Database is the source of truth
- Reports update in real-time as preorders are created

## Security Notes

- Reports are only available in non-production environments
- API endpoints return 404 in production
- No raw email addresses are exposed in reports
- All data comes from server-side aggregation
