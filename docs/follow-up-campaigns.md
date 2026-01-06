# Follow-Up Campaigns Guide

This document explains how to create and manage follow-up campaigns for recipients who didn't convert.

## Overview

Follow-up campaigns allow you to re-engage recipients who:
- Were sent the original campaign
- Clicked through (optional)
- Did NOT create a preorder within a defined time window

This is a powerful tool for improving overall campaign conversion rates.

## Key Concepts

### What is a Follow-Up Campaign?

A follow-up campaign is a **first-class campaign** that:
- References a parent (original) campaign
- Targets non-converted recipients from the parent
- Has its own template, subject, and schedule
- Tracks its own sends, clicks, and leads

### Non-Converted Recipients

A recipient is considered "non-converted" if:
1. They were sent the parent campaign (status = 'sent')
2. They are still subscribed
3. They do NOT have a preorder attributed to the parent campaign
4. The preorder check is within a configurable time window

### Conversion Window

The conversion window defines how long to wait before considering a recipient "non-converted":
- **24 hours**: Aggressive follow-up
- **48 hours**: Standard (default)
- **72 hours**: Conservative
- **7 days**: Long-term follow-up

Recipients who convert after the window closes will still be attributed to the parent campaign, but won't be excluded from the follow-up.

## Creating a Follow-Up Campaign

### Via Internal UI

1. Navigate to `/internal/marketing/campaigns/[id]`
2. Scroll to the "Follow-Up Campaign" section
3. Click "Create Follow-Up"
4. Fill in the modal form:
   - **Campaign Name**: Auto-generated, can be customized
   - **Email Subject**: New subject for follow-up
   - **Conversion Window**: How long to wait for conversions
   - **Schedule**: When to send (optional)
   - **Template**: Choose and customize email template
5. Click "Create Follow-Up Campaign"

### Via API

```bash
POST /api/marketing/campaigns/[parent_id]/follow-up
Content-Type: application/json

{
  "name": "Follow-up: January Sale",
  "subject": "Все още мислиш? 🤔",
  "template": "{\"templateId\":\"discount\",\"discountPercent\":15,...}",
  "previewText": "Офертата все още важи!",
  "scheduledStartAt": "2026-01-08T10:00:00Z",
  "followUpWindowHours": 48,
  "populateSends": true
}
```

Response:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Follow-up: January Sale",
    "campaign_type": "follow_up",
    "parent_campaign_id": "parent-uuid",
    "follow_up_window_hours": 48,
    ...
  },
  "eligibleCount": 45,
  "sendsCreated": 45
}
```

### Check Eligible Count First

Before creating, you can check how many recipients are eligible:

```bash
GET /api/marketing/campaigns/[parent_id]/follow-up?windowHours=48
```

Response:
```json
{
  "success": true,
  "eligibleCount": 45,
  "windowHours": 48
}
```

## Follow-Up Campaign Workflow

### 1. Parent Campaign Completes

Wait for the parent campaign to finish sending (status = 'completed' or 'sending').

### 2. Wait for Conversion Window

Allow time for recipients to convert. The window starts from the parent campaign's `scheduled_start_at`.

### 3. Create Follow-Up

Use the UI or API to create the follow-up campaign. This:
- Creates a new campaign with `campaign_type = 'follow_up'`
- Links to parent via `parent_campaign_id`
- Optionally creates send records for eligible recipients

### 4. Review and Schedule

- Review the eligible recipient count
- Customize the email template
- Set the schedule time
- The campaign starts in 'draft' or 'scheduled' status

### 5. Send Follow-Up

The follow-up campaign follows the same sending process as primary campaigns:
- Runner picks up scheduled campaigns
- Sends emails in batches
- Tracks progress and status

### 6. Monitor Results

View follow-up performance in:
- The follow-up campaign's own detail page
- The parent campaign's reporting section (shows linked follow-ups)

## Database Schema

### Campaign Table Extensions

```sql
ALTER TABLE marketing_campaigns ADD COLUMN
  parent_campaign_id UUID REFERENCES marketing_campaigns(id),
  campaign_type campaign_type DEFAULT 'primary',
  follow_up_window_hours INTEGER DEFAULT 48;
```

### Campaign Types

| Type | Description |
|------|-------------|
| `primary` | Original campaign (default) |
| `follow_up` | Follow-up to a parent campaign |

## Best Practices

### Timing

- **Wait at least 24-48 hours** before sending follow-ups
- **Don't send too many follow-ups** - one per parent campaign is usually enough
- **Consider time zones** when scheduling

### Content

- **Acknowledge the first email**: "We noticed you haven't ordered yet..."
- **Add urgency**: Limited time offers, expiring discounts
- **Different angle**: Highlight different benefits or features
- **Shorter content**: Recipients already know the basics

### Subject Lines

Good follow-up subjects:
- "Все още мислиш? 🤔"
- "Пропусна ли нещо?"
- "Последен шанс за [offer]"
- "Имаме въпрос..."

### Audience

- **Don't over-email**: Respect unsubscribes
- **Check eligible count**: If very low, may not be worth it
- **Consider segmentation**: Different follow-ups for clickers vs non-clickers

## Safety Features

### Idempotency

- Each recipient can only receive ONE follow-up per parent campaign
- Unique constraint on `(campaign_id, email)` prevents duplicates
- Re-running follow-up creation won't create duplicate sends

### Unsubscribe Respect

- Unsubscribed recipients are automatically excluded
- Unsubscribe status is checked at send time
- Follow-ups include unsubscribe links

### Kill-Switch

Follow-up campaigns obey the same rules as primary campaigns:
- Can be paused/cancelled at any time
- Status is checked before each send
- Global environment check blocks production

### Audit Trail

All follow-up activity is tracked:
- Campaign creation with parent reference
- Send records with timestamps
- Status changes

## Stopping a Follow-Up

### Pause (Reversible)

```bash
POST /api/marketing/campaigns/[follow_up_id]/actions
Content-Type: application/json

{"action": "pause"}
```

### Cancel (Permanent)

```bash
POST /api/marketing/campaigns/[follow_up_id]/actions
Content-Type: application/json

{"action": "cancel"}
```

### Emergency SQL

```sql
-- Pause a follow-up campaign
UPDATE marketing_campaigns 
SET status = 'paused' 
WHERE id = 'follow-up-uuid';

-- Pause all follow-ups for a parent
UPDATE marketing_campaigns 
SET status = 'paused' 
WHERE parent_campaign_id = 'parent-uuid';
```

## Reporting

### Follow-Up Metrics

Follow-up campaigns have their own reporting:
- Sends, clicks, leads
- Conversion rates
- Revenue

### Parent Campaign View

The parent campaign's reporting section shows:
- List of follow-up campaigns
- Status and send counts
- Links to follow-up detail pages

### Incremental Lift

To calculate follow-up effectiveness:
```
Incremental Leads = Follow-up Leads
Incremental Rate = Follow-up Leads / Non-Converted Recipients
```

## Troubleshooting

### "No eligible recipients"

- Check if parent campaign has completed
- Verify conversion window hasn't passed
- Ensure recipients haven't all converted or unsubscribed

### Follow-up not sending

- Check campaign status (must be 'scheduled' or 'sending')
- Verify scheduled time has passed
- Check runner is active

### Duplicate follow-ups

- Not possible due to unique constraint
- If you need another follow-up, create a new one with different settings

## API Reference

### Get Eligible Count

```
GET /api/marketing/campaigns/[id]/follow-up?windowHours=48
```

### Create Follow-Up

```
POST /api/marketing/campaigns/[id]/follow-up
```

### Get Follow-Up Campaigns for Parent

Included in reporting endpoint:
```
GET /api/marketing/campaigns/[id]/reporting
```

Response includes `followUps` array.
