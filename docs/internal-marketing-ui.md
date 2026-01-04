# Internal Marketing UI

This document describes the internal-only marketing campaign UI that is accessible only in non-production environments.

## Overview

The internal marketing UI provides a frontend interface for the existing marketing campaign system. It allows QA, ops, and marketing teams to:

- View and monitor marketing campaigns
- Track campaign progress and send statistics
- Pause, resume, and manage campaigns
- View recipient statistics (aggregate only)
- Review send history and errors

## Production Safety

**CRITICAL: This UI must NEVER be accessible in production.**

### Environment Gating

The UI is protected by multiple layers of environment checks:

1. **Layout-level gating** (`app/internal/layout.tsx`)
   - Checks `isInternalEnvironment()` before rendering
   - Returns 404 in production environments
   - All child routes inherit this protection

2. **Navigation link gating** (`components/InternalNavLink.tsx`)
   - Links to internal tools only render in non-production
   - Uses client-side environment check
   - Returns `null` in production (not just hidden)

3. **API route protection** (defense in depth)
   - Marketing API routes should validate environment
   - Reject requests in production as additional safety

### Allowed Environments

Internal features are accessible in:
- `feat` - Feature branches
- `dev` / `development` - Development
- `stage` - Staging/pre-production
- `preview` - Vercel preview deployments

### Blocked Environments

Internal features are blocked in:
- `production` / `prod` - Production
- Any unknown or missing environment value (fail-closed)

### Environment Detection

The system checks environment variables in this order:
1. `NEXT_PUBLIC_APP_ENV` - Custom app environment (recommended)
2. `VERCEL_ENV` - Vercel deployment environment
3. `NODE_ENV` - Node.js environment (fallback)

### Fail-Closed Behavior

If the environment variable is missing or has an unexpected value, the system treats it as production:
- Routes return 404
- Components render nothing
- Navigation links don't appear
- API calls are rejected

This ensures that misconfiguration defaults to the safest state.

## Route Structure

```
/internal/
├── page.tsx                           # Dashboard
└── marketing/
    ├── campaigns/
    │   ├── page.tsx                   # Campaign list
    │   └── [id]/
    │       ├── page.tsx               # Campaign detail
    │       ├── CampaignActions.tsx    # Action buttons
    │       └── SendHistorySection.tsx # Send history
    └── recipients/
        └── page.tsx                   # Recipient stats
```

## Features

### Campaign List (`/internal/marketing/campaigns`)

- Lists all campaigns with status indicators
- Shows progress bars for active campaigns
- Displays aggregate stats (total, sent, failed, skipped)
- Links to campaign detail pages

### Campaign Detail (`/internal/marketing/campaigns/[id]`)

- Full campaign metadata
- Live progress counters
- Status-based action buttons:
  - **Start Campaign** - Begin sending (requires confirmation)
  - **Dry-Run** - Simulate without sending emails
  - **Pause** - Temporarily stop sending
  - **Resume** - Continue paused campaign
  - **Cancel** - Permanently stop (requires confirmation)
- Template preview (read-only)
- Send history with error visibility

### Recipients Overview (`/internal/marketing/recipients`)

- Total recipient count
- Subscribed vs unsubscribed breakdown
- Tag distribution chart
- Source distribution chart
- **Does NOT expose raw email lists** (privacy protection)

## Navigation Integration

Internal tools are accessible via:
1. Footer link (only in non-production)
2. Direct URL navigation (returns 404 in production)

The footer shows:
- Environment badge (DEV, STAGE, etc.)
- "Internal" link with gear icon

## Data Access

All data access follows these rules:
- Server components fetch data directly via service functions
- No client-side Supabase access to marketing tables
- API routes use server-side authentication
- Email addresses are masked in send history

## Rollback

If this UI causes issues:
1. Delete the `app/internal` directory
2. Remove `InternalNavLink` imports from Footer
3. Optionally remove `lib/internal` and `components/InternalNavLink.tsx`

The marketing backend functionality is unaffected by UI removal.

## Configuration

### Required Environment Variables

For non-production environments, set:

```env
# Recommended: Explicit app environment
NEXT_PUBLIC_APP_ENV=dev  # or: feat, stage, preview

# Alternative: Vercel sets this automatically
# VERCEL_ENV=development
```

For production, either:
- Set `NEXT_PUBLIC_APP_ENV=production`
- Or don't set it (fail-closed behavior)

### Vercel Configuration

Vercel automatically sets `VERCEL_ENV`:
- `production` for production deployments
- `preview` for preview deployments
- `development` for local development

## Security Considerations

1. **No sensitive data exposure**
   - Email addresses are masked
   - Only aggregate stats shown
   - No API keys or secrets in UI

2. **Server-side data access**
   - All queries go through server components
   - No direct Supabase client access
   - RLS policies enforced

3. **Action confirmation**
   - Destructive actions require confirmation
   - Clear warnings for irreversible operations

4. **Defense in depth**
   - Multiple layers of environment checks
   - Layout, component, and API-level protection

## Mapping: Frontend Actions → Backend Behavior

| UI Action | API Endpoint | Backend Function |
|-----------|--------------|------------------|
| View campaigns | GET /api/marketing/campaigns | `getAllCampaigns()` |
| View campaign | GET /api/marketing/campaigns/[id] | `getCampaignById()` |
| Start campaign | POST /api/marketing/campaigns/[id]/actions | `startCampaign()` |
| Dry-run | POST /api/marketing/campaigns/[id]/actions | `startCampaign({ dryRun: true })` |
| Pause | POST /api/marketing/campaigns/[id]/actions | `pauseCampaign()` |
| Resume | POST /api/marketing/campaigns/[id]/actions | `resumeCampaign()` |
| Cancel | POST /api/marketing/campaigns/[id]/actions | `cancelCampaign()` |
| View recipients | Direct DB query | `getRecipientsByFilter()` |

## File Reference

| File | Purpose |
|------|---------|
| `lib/internal/environment.ts` | Environment detection and gating |
| `lib/internal/index.ts` | Module exports |
| `app/internal/layout.tsx` | Internal layout with env check |
| `app/internal/page.tsx` | Dashboard page |
| `app/internal/marketing/campaigns/page.tsx` | Campaign list |
| `app/internal/marketing/campaigns/[id]/page.tsx` | Campaign detail |
| `app/internal/marketing/campaigns/[id]/CampaignActions.tsx` | Action buttons |
| `app/internal/marketing/campaigns/[id]/SendHistorySection.tsx` | Send history |
| `app/internal/marketing/recipients/page.tsx` | Recipient stats |
| `components/InternalNavLink.tsx` | Conditional nav link |
