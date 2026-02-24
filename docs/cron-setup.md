# Cron Job Setup — Automated Order Generation

## Overview

The subscription system uses a daily cron job to automatically generate orders
for active subscriptions when a delivery cycle becomes eligible (`delivery_date ≤ today`).

The cron endpoint: `GET /api/cron/generate-orders`

## How It Works

1. The cron job runs daily at **06:00 UTC** (08:00/09:00 Bulgarian time)
2. It checks for the earliest `upcoming` delivery cycle where `delivery_date <= today`
3. If found, it generates orders for all eligible active subscriptions:
   - Skips **paused** subscriptions
   - Skips **seasonal** subscriptions that haven't reached their cadence (every 3 cycles)
   - Skips subscriptions that already have an order for this cycle
4. Results are logged and persisted to `site_config` table
5. Admin is notified via email on success, errors, or failure

## Option A: Vercel Cron Jobs (Primary)

### Setup

1. **Add `CRON_SECRET` environment variable** in Vercel dashboard:
   - Go to: Project Settings → Environment Variables
   - Name: `CRON_SECRET`
   - Value: Generate a secure random string (min 32 chars):
     ```bash
     openssl rand -hex 32
     ```
   - Scope: Production (and Preview if testing)

2. **Deploy** — the `vercel.json` file in the project root configures the cron:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/generate-orders",
         "schedule": "0 6 * * *"
       }
     ]
   }
   ```

3. **Verify** in Vercel dashboard:
   - Go to: Project → Settings → Cron Jobs
   - You should see the cron job listed with its schedule
   - Use "Trigger" button to run manually

### Vercel-Specific Notes

- Vercel automatically injects `CRON_SECRET` as `Authorization: Bearer <value>` header
- **Pro plan**: Cron runs reliably on schedule; 1 cron job allowed on Hobby plan
- **Hobby plan**: Daily cron is supported (min interval = 1 day)
- Timeout: max 60 seconds on Hobby, 300 on Pro — should be sufficient
- Logs visible in Vercel dashboard → Logs tab (filter by `/api/cron/`)

## Option B: GitHub Actions (Fallback/Alternative)

### Setup

1. **Add repository secrets** in GitHub:
   - Go to: Repo → Settings → Secrets and variables → Actions
   - Add `APP_URL`: Your production URL (e.g., `https://fitflow.bg`)
   - Add `CRON_SECRET`: Same value as in Vercel

2. **Enable the workflow**:
   - The file `.github/workflows/cron-generate-orders.yml` is included
   - GitHub Actions schedules are automatically active for the default branch

3. **Manual trigger**:
   - Go to: Repo → Actions → "Cron - Generate Subscription Orders"
   - Click "Run workflow"
   - Optionally provide a specific `cycle_id`

### GitHub Actions Notes

- Schedule may be delayed up to 15 minutes during high-load periods
- Workflow will fail (and notify) if the response status is not 200
- Check run history: Actions tab → "Cron - Generate Subscription Orders"
- Each run produces a Job Summary with the generation result

## Monitoring

### Vercel Logs

- Filter by path: `/api/cron/generate-orders`
- Look for `[CRON]` prefix in log messages
- Key log entries:
  - `[CRON] Order generation completed: {...}` — success
  - `[CRON] Order generation failed: ...` — failure

### Admin Dashboard

The admin dashboard shows:
- **Last cron run**: timestamp from `site_config` key `cron_last_run`
- **Last result**: summary from `site_config` key `cron_last_result`
- Check at: `/admin` dashboard

### Email Notifications

Three types of email notifications (requires Brevo template IDs configured):

| Notification | Template ID Env Var | Brevo Subject |
|---|---|---|
| **Success** | `BREVO_CRON_SUCCESS_TEMPLATE_ID` | `[FitFlow] Генериране на поръчки — успешно` |
| **Partial errors** | `BREVO_CRON_ERRORS_TEMPLATE_ID` | `[FitFlow] ⚠ Генериране на поръчки — частични грешки` |
| **Complete failure** | `BREVO_CRON_FAILURE_TEMPLATE_ID` | `[FitFlow] ❌ Генериране на поръчки — неуспешно` |

Recipient: `ADMIN_EMAIL` env var (default: `admin@fitflow.bg`)

If the Brevo template ID env vars are not set (or `0`), the corresponding notification is silently skipped.

### Brevo Template Variables

**Success template** (`cron-generation-success`):
- `cycleId`, `cycleDate`, `generated`, `skipped`, `excluded`, `timestamp`

**Errors template** (`cron-generation-errors`):
- `cycleId`, `cycleDate`, `generated`, `errors`, `errorDetails`, `timestamp`

**Failure template** (`cron-generation-failure`):
- `error`, `timestamp`

## Manual Trigger from CLI

For testing or emergency re-runs:

```bash
# Auto-detect eligible cycle
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fitflow.bg/api/cron/generate-orders

# Check result (formatted)
curl -s -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fitflow.bg/api/cron/generate-orders | jq '.'
```

## Secret Management

| Secret | Where | Purpose |
|--------|-------|---------|
| `CRON_SECRET` | Vercel env vars | Authenticates cron requests to the API |
| `CRON_SECRET` | GitHub repo secrets | Same value, for GitHub Actions fallback |
| `APP_URL` | GitHub repo secrets | Production URL for GitHub Actions to call |
| `ADMIN_EMAIL` | Vercel env vars | Email recipient for cron notifications |
| `BREVO_CRON_SUCCESS_TEMPLATE_ID` | Vercel env vars | Brevo template ID for success emails |
| `BREVO_CRON_ERRORS_TEMPLATE_ID` | Vercel env vars | Brevo template ID for error emails |
| `BREVO_CRON_FAILURE_TEMPLATE_ID` | Vercel env vars | Brevo template ID for failure emails |

### Rotating the CRON_SECRET

1. Generate a new secret: `openssl rand -hex 32`
2. Update in Vercel: Project Settings → Environment Variables
3. Update in GitHub: Repo Settings → Secrets → `CRON_SECRET`
4. Redeploy to pick up the new Vercel env var
5. Verify by triggering a manual run

## Site Config Keys

These keys are auto-created on first cron run:

| Key | Type | Description |
|-----|------|-------------|
| `cron_last_run` | ISO timestamp string | When the cron last ran |
| `cron_last_result` | JSON string | Summary of last run result |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | `CRON_SECRET` mismatch or missing | Verify env var matches in both Vercel and GitHub |
| "Няма предстоящ цикъл" | No upcoming cycle has `delivery_date <= today` | Create a delivery cycle in admin, or check dates |
| Timeout | Too many subscriptions to process | Increase `maxDuration` or batch in smaller groups |
| Email not sent | Template ID env var not set or Brevo config issue | Check env vars and Brevo API key |
| GitHub Actions delayed | Normal GH Actions schedule variance | Use Vercel Cron as primary; GH Actions as backup |
| Duplicate orders | Job ran twice for same cycle | Safe — `generateOrdersForCycle` skips subs that already have an order for the cycle |
