# Marketing Campaign Rollback & Kill-Switch Guide

This document explains how to safely stop, pause, resume, and recover marketing campaigns without data loss or duplicate sends.

## Campaign Status as Kill-Switch

The campaign `status` field is the primary kill-switch. The runner **only** processes campaigns with status `scheduled` or `sending`.

### Valid Statuses

| Status | Description | Runner Behavior |
|--------|-------------|-----------------|
| `draft` | Campaign being created | **Not processed** |
| `scheduled` | Waiting for start time | Processed when `scheduled_start_at <= now()` |
| `sending` | Currently sending | Continues processing |
| `paused` | Manually stopped | **Not processed** - runner exits gracefully |
| `completed` | All sends finished | **Not processed** |
| `cancelled` | Permanently stopped | **Not processed** |

## How the Runner Checks Status

The runner performs status checks at multiple points:

1. **Before processing**: Only fetches campaigns with `status = 'scheduled'`
2. **Before each batch**: Re-fetches campaign to check status
3. **Before each send**: Checks if status changed to `paused` or `cancelled`

```typescript
// In processCampaign():
for (const send of sends) {
  // Check if campaign was paused/cancelled
  const { data: currentCampaign } = await getCampaignById(campaign.id);
  if (currentCampaign?.status === 'paused' || currentCampaign?.status === 'cancelled') {
    console.log(`Campaign ${campaign.id} was ${currentCampaign.status}`);
    hasMore = false;
    break;
  }
  // ... send email
}
```

## Rollback Scenarios

### 1. Stop an Active Campaign Immediately

**Via API:**
```bash
curl -X POST https://fitflow.bg/api/marketing/campaigns/{id}/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'
```

**Via SQL (Emergency):**
```sql
-- Immediately stop a campaign
UPDATE marketing_campaigns 
SET status = 'paused', updated_at = NOW()
WHERE id = 'campaign-uuid';
```

**What happens:**
- Runner detects status change before next send
- In-flight email (if any) completes
- No more emails are sent
- Lock is released
- Campaign can be resumed later

### 2. Abort a Campaign Mid-Run

**Via API:**
```bash
curl -X POST https://fitflow.bg/api/marketing/campaigns/{id}/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "cancel"}'
```

**Via SQL (Emergency):**
```sql
-- Permanently cancel a campaign
UPDATE marketing_campaigns 
SET status = 'cancelled', updated_at = NOW()
WHERE id = 'campaign-uuid';
```

**What happens:**
- Same as pause, but campaign cannot be resumed
- Remaining queued sends stay in `queued` status (auditable)
- No data is deleted

### 3. Re-run After Failure (Idempotency)

If the runner crashes mid-execution:

1. **Lock expires** after 10 minutes (configurable)
2. **Next runner invocation** can acquire the lock
3. **Already-sent emails** have `status = 'sent'` and are skipped
4. **Unique constraint** `(campaign_id, email)` prevents duplicates

**Why duplicates are impossible:**
```sql
-- This constraint exists on marketing_sends
CONSTRAINT unique_campaign_recipient UNIQUE(campaign_id, email)
```

Even if you manually re-run:
```typescript
await startCampaign(campaignId);
// Creates sends only for recipients not already in marketing_sends
```

### 4. Resume a Paused Campaign

**Via API:**
```bash
curl -X POST https://fitflow.bg/api/marketing/campaigns/{id}/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "resume"}'
```

**Via SQL + API:**
```sql
-- First, set status to paused (if not already)
UPDATE marketing_campaigns 
SET status = 'paused'
WHERE id = 'campaign-uuid';
```

Then call the resume API or:
```sql
-- Set to sending to allow runner to pick it up
UPDATE marketing_campaigns 
SET status = 'sending', updated_at = NOW()
WHERE id = 'campaign-uuid';
```

**What happens:**
- Runner fetches remaining `queued` sends
- Already `sent` emails are not re-sent
- Campaign continues from where it stopped

## Emergency SQL Commands

### View Campaign Status
```sql
SELECT id, name, status, total_recipients, sent_count, failed_count, skipped_count,
       locked_by, locked_at, started_at, completed_at
FROM marketing_campaigns
WHERE id = 'campaign-uuid';
```

### View Send Progress
```sql
SELECT status, COUNT(*) as count
FROM marketing_sends
WHERE campaign_id = 'campaign-uuid'
GROUP BY status;
```

### Force Release Lock
```sql
-- Only use if runner crashed and lock is stale
UPDATE marketing_campaigns
SET locked_by = NULL, locked_at = NULL
WHERE id = 'campaign-uuid'
  AND locked_at < NOW() - INTERVAL '10 minutes';
```

### Pause All Active Campaigns
```sql
-- Emergency: stop all sending campaigns
UPDATE marketing_campaigns
SET status = 'paused', updated_at = NOW()
WHERE status IN ('scheduled', 'sending');
```

### Check for Stuck Campaigns
```sql
-- Find campaigns that might be stuck
SELECT id, name, status, locked_by, locked_at,
       NOW() - locked_at as lock_duration
FROM marketing_campaigns
WHERE locked_by IS NOT NULL
  AND locked_at < NOW() - INTERVAL '15 minutes';
```

## Idempotency Guarantees

### Send Records
- Each `(campaign_id, email)` pair can only have ONE send record
- Attempting to insert a duplicate fails silently
- Status transitions: `queued` → `sending` → `sent`/`failed`/`skipped`

### Status Transitions
```
draft → scheduled → sending → completed
                  ↘ paused ↗
                  ↘ cancelled (terminal)
```

### What Prevents Double Sends

1. **Database constraint**: `UNIQUE(campaign_id, email)`
2. **Status check**: Only `queued` or retryable `failed` sends are processed
3. **Atomic updates**: `markSendAsSent()` updates status atomically
4. **Lock mechanism**: Only one runner processes a campaign at a time

## Dry-Run Mode

Test a campaign without sending emails:

```typescript
import { startCampaign, DEFAULT_RUNNER_CONFIG } from '@/lib/marketing';

await startCampaign(campaignId, {
  ...DEFAULT_RUNNER_CONFIG,
  dryRun: true,
});
```

**What happens:**
- Send records are created
- Emails are NOT sent
- Sends are marked as `skipped` with reason "Dry-run mode"
- You can verify audience size and template rendering

## Audit Trail

All operations are auditable:

### Campaign History
```sql
SELECT id, status, updated_at, started_at, completed_at
FROM marketing_campaigns
WHERE id = 'campaign-uuid';
```

### Send History
```sql
SELECT email, status, error, attempt_count, sent_at, created_at, updated_at
FROM marketing_sends
WHERE campaign_id = 'campaign-uuid'
ORDER BY updated_at DESC;
```

### Failed Sends
```sql
SELECT email, error, attempt_count, next_retry_at
FROM marketing_sends
WHERE campaign_id = 'campaign-uuid'
  AND status = 'failed';
```

## Recovery Checklist

If something goes wrong:

1. **Pause the campaign immediately**
   ```sql
   UPDATE marketing_campaigns SET status = 'paused' WHERE id = '...';
   ```

2. **Check current progress**
   ```sql
   SELECT * FROM get_campaign_progress('campaign-uuid');
   ```

3. **Investigate failures**
   ```sql
   SELECT email, error FROM marketing_sends 
   WHERE campaign_id = '...' AND status = 'failed';
   ```

4. **Release stale lock if needed**
   ```sql
   UPDATE marketing_campaigns 
   SET locked_by = NULL, locked_at = NULL 
   WHERE id = '...' AND locked_at < NOW() - INTERVAL '10 minutes';
   ```

5. **Resume when ready**
   ```sql
   UPDATE marketing_campaigns SET status = 'sending' WHERE id = '...';
   ```
   Or use the API: `POST /api/marketing/campaigns/{id}/actions` with `{"action": "resume"}`

## Security Notes

- **No destructive deletes**: Rollback never deletes data
- **Audit trail preserved**: All status changes are timestamped
- **Reversible operations**: Paused campaigns can be resumed
- **No secrets in DB**: Tokens are signed with env variables, not stored
