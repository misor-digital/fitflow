# Marketing Campaign System

A minimal email marketing campaign system for FitFlow, built on top of the existing Brevo email integration.

## Overview

The marketing campaign system allows you to:
- Create and manage email campaigns
- Manage recipient lists with tags for segmentation
- Schedule campaigns for future delivery
- Track send status per recipient
- Handle unsubscribes

## Database Schema

The system uses three main tables:

### `marketing_campaigns`
Stores campaign definitions:
- `name` - Internal campaign name
- `subject` - Email subject line
- `template` - HTML template with `{{variable}}` placeholders
- `preview_text` - Email preview text
- `scheduled_start_at` - When to start sending
- `status` - draft, scheduled, sending, paused, completed, cancelled
- `recipient_filter` - JSON filter for targeting recipients

### `marketing_recipients`
Stores email recipients:
- `email` - Recipient email (unique, case-insensitive)
- `name` - Optional display name
- `tags` - Array of tags for segmentation
- `subscribed` - Subscription status
- `source` - Where they came from (preorder, manual, import)

### `marketing_sends`
Tracks individual email sends:
- `campaign_id` - Reference to campaign
- `recipient_id` - Reference to recipient
- `email` - Denormalized email address
- `status` - queued, sending, sent, failed, skipped, bounced
- `provider_message_id` - Message ID from Brevo
- `error` - Error message if failed
- `attempt_count` - Number of send attempts
- Unique constraint on `(campaign_id, email)` prevents duplicates

## API Endpoints

### Campaigns

```
GET  /api/marketing/campaigns          - List all campaigns with progress
POST /api/marketing/campaigns          - Create a new campaign
GET  /api/marketing/campaigns/[id]     - Get campaign details
PATCH /api/marketing/campaigns/[id]    - Update campaign
POST /api/marketing/campaigns/[id]/actions - Execute action (start/pause/resume/cancel)
```

### Recipients

```
GET  /api/marketing/recipients         - List recipients with filtering
POST /api/marketing/recipients         - Create/update recipient(s)
```

### Runner

```
GET  /api/marketing/runner             - Get runner status
POST /api/marketing/runner             - Trigger campaign processor
```

### Unsubscribe

```
GET  /api/marketing/unsubscribe        - Handle unsubscribe link clicks
POST /api/marketing/unsubscribe        - Unsubscribe via API
```

## Usage Examples

### Create a Campaign

```typescript
import { createCampaign } from '@/lib/marketing';

const { data: campaign } = await createCampaign({
  name: 'January Newsletter',
  subject: 'Здравей, {{name}}! Нови продукти в FitFlow',
  template: `
    <h2>Здравей, {{name}}!</h2>
    <p>Имаме страхотни новини за теб...</p>
  `,
  preview_text: 'Виж какво ново има в FitFlow',
  recipient_filter: {
    tags: ['preorder'],
    subscribedOnly: true,
  },
});
```

### Add Recipients

```typescript
import { upsertRecipient, bulkImportRecipients } from '@/lib/marketing';

// Single recipient
await upsertRecipient({
  email: 'user@example.com',
  name: 'John Doe',
  tags: ['preorder', 'premium'],
  source: 'preorder',
});

// Bulk import
await bulkImportRecipients([
  { email: 'user1@example.com', name: 'User 1', tags: ['newsletter'] },
  { email: 'user2@example.com', name: 'User 2', tags: ['newsletter'] },
]);
```

### Start a Campaign

```typescript
import { startCampaign } from '@/lib/marketing';

// This will:
// 1. Get recipients matching the filter
// 2. Create send records for each recipient
// 3. Start sending emails in batches
const result = await startCampaign(campaignId);
```

### Query Campaign Progress

```typescript
import { getCampaignProgress } from '@/lib/marketing';

const { data: progress } = await getCampaignProgress(campaignId);
// Returns: { total, queued, sending, sent, failed, skipped, bounced, progress_percent }
```

## Template Variables

Templates support `{{variable}}` placeholders:

- `{{email}}` - Recipient's email address
- `{{name}}` - Recipient's name (if available)
- `{{unsubscribe_url}}` - Auto-generated unsubscribe link

Example template:
```html
<h2>Здравей, {{name}}!</h2>
<p>Благодарим ти, че си част от FitFlow.</p>
<p><a href="{{unsubscribe_url}}">Отписване</a></p>
```

## Scheduling

Campaigns can be scheduled for future delivery:

```typescript
await createCampaign({
  name: 'Scheduled Campaign',
  subject: 'Coming Soon!',
  template: '...',
  scheduled_start_at: '2026-01-15T10:00:00Z',
  status: 'scheduled',
});
```

The campaign runner checks for scheduled campaigns and starts them when `scheduled_start_at <= now()`.

## Running the Campaign Processor

The campaign processor can be triggered in several ways:

### 1. Via API (for cron jobs)

```bash
# Set MARKETING_RUNNER_SECRET in .env for security
curl -X POST https://fitflow.bg/api/marketing/runner \
  -H "Authorization: Bearer YOUR_SECRET"
```

### 2. Programmatically

```typescript
import { runCampaignProcessor } from '@/lib/marketing';

// Run once
const result = await runCampaignProcessor();
console.log(`Processed: ${result.processed}, Errors: ${result.errors}`);
```

### 3. With Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/marketing/runner",
    "schedule": "*/5 * * * *"
  }]
}
```

## Rate Limiting & Batching

The runner uses configurable batching to avoid hitting provider rate limits:

```typescript
import { runCampaignProcessor, DEFAULT_RUNNER_CONFIG } from '@/lib/marketing';

// Default config
const config = {
  batchSize: 50,           // Emails per batch
  batchDelayMs: 1000,      // Delay between batches
  sendDelayMs: 100,        // Delay between individual sends
  lockTimeoutMinutes: 10,  // Lock timeout for distributed locking
  maxRetryAttempts: 3,     // Max retries for failed sends
  retryBaseDelayMs: 60000, // Base delay for exponential backoff
};

await runCampaignProcessor(config);
```

## Reliability Features

### Idempotent Sends
- Unique constraint on `(campaign_id, email)` prevents duplicate sends
- If the runner crashes and restarts, it will skip already-sent emails

### Retry Logic
- Failed sends are retried up to 3 times (configurable)
- Exponential backoff: 1min, 2min, 4min
- After max attempts, marked as permanently failed

### Distributed Locking
- Database-level locking prevents multiple runners from processing the same campaign
- Lock timeout prevents deadlocks if a runner crashes

### Graceful Error Handling
- Provider errors don't crash the job
- Each send is processed independently
- Stats are synced periodically

## Observability

### Campaign Progress

Query progress via API or directly:

```sql
SELECT * FROM get_campaign_progress('campaign-uuid');
```

Returns:
```json
{
  "total": 1000,
  "queued": 100,
  "sending": 0,
  "sent": 850,
  "failed": 20,
  "skipped": 30,
  "bounced": 0,
  "progress_percent": 90.00
}
```

### Runner Status

```typescript
import { getRunnerStatus } from '@/lib/marketing';

const status = getRunnerStatus();
// { isRunning, runnerId, currentCampaignId, processedCount, errorCount, startedAt }
```

## Environment Variables

Add to `.env`:

```env
# Existing Brevo config
BREVO_API_KEY=your-api-key
BREVO_SENDER_EMAIL=info@fitflow.bg
BREVO_SENDER_NAME=FitFlow

# Optional: Protect runner endpoint
MARKETING_RUNNER_SECRET=your-secret-key
```

## Migration

Run the migration to create the marketing tables:

```bash
# Via Supabase CLI
supabase db push

# Or manually in SQL Editor
# Copy contents of supabase/migrations/20260104000000_create_marketing_tables.sql
```

## Integration with Preorders

To automatically add preorder customers to the marketing list, update the preorder workflow:

```typescript
// In app/api/preorder/route.ts, after saving preorder:
import { upsertRecipient } from '@/lib/marketing';

await upsertRecipient({
  email: preorder.email,
  name: preorder.full_name,
  tags: ['preorder', preorder.box_type],
  source: 'preorder',
  metadata: {
    preorderId: preorder.id,
    boxType: preorder.box_type,
  },
});
```

## Dry-Run Mode

Test a campaign without sending actual emails:

```typescript
import { startCampaign, DEFAULT_RUNNER_CONFIG } from '@/lib/marketing';

// Run in dry-run mode
await startCampaign(campaignId, {
  ...DEFAULT_RUNNER_CONFIG,
  dryRun: true,
});
```

In dry-run mode:
- Send records are created normally
- Emails are NOT actually sent
- Sends are marked as `skipped` with reason "Dry-run mode"
- Useful for validating audience size and template rendering

## Unsubscribe Links

All marketing emails include signed unsubscribe links for security:

```typescript
import { generateSignedUnsubscribeUrl } from '@/lib/marketing';

// Generate a signed unsubscribe URL
const url = generateSignedUnsubscribeUrl('user@example.com', campaignId);
// https://fitflow.bg/api/marketing/unsubscribe?token=...
```

The token is HMAC-signed and includes:
- Email address (lowercase)
- Campaign ID (optional)
- Timestamp

This prevents:
- Email enumeration attacks
- Unauthorized unsubscriptions
- Token tampering

## Security

### API Protection

The runner endpoint should be protected:

```env
# Add to .env
MARKETING_RUNNER_SECRET=your-secret-key
```

```bash
# Call with authorization
curl -X POST https://fitflow.bg/api/marketing/runner \
  -H "Authorization: Bearer your-secret-key"
```

### Recipient Privacy

- Recipient lists are NOT exposed to clients
- All recipient operations require service_role access
- Unsubscribe tokens are signed, not stored

### No Secrets in Database

- Unsubscribe tokens are signed with env variables
- No API keys or secrets stored in tables
- All sensitive operations use server-side code

## Rollback & Kill-Switch

See [marketing-rollback.md](./marketing-rollback.md) for detailed documentation on:

- Pausing campaigns immediately
- Cancelling campaigns mid-run
- Resuming paused campaigns
- Recovering from failures
- Emergency SQL commands
- Idempotency guarantees
