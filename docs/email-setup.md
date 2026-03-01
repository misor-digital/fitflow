# Email Service Setup Guide — Brevo Integration

## Overview

FitFlow uses [Brevo](https://www.brevo.com/) as an SMTP transport layer for all transactional emails. **All email templates are code-controlled** in `lib/email/` — no Brevo dashboard templates are used for transactional emails.

## Architecture

```
Email Templates (TypeScript)
├── lib/email/constants.ts              — design tokens (colors, fonts, spacing)
├── lib/email/layout.ts                 — shared header/footer/wrapper
├── lib/email/templates.ts              — order, invite, magic-link, auth templates
├── lib/email/subscription-templates.ts — subscription lifecycle templates
└── lib/email/labels.ts                 — centralized DB label resolution

Email Sending
├── lib/email/emailService.ts           — low-level Brevo SDK wrapper
├── lib/email/brevo/transactional.ts    — adds logging + usage tracking
└── lib/email/brevo/campaigns.ts        — marketing campaign APIs

Excluded (legacy, pending deletion):
└── lib/email/preorder-campaign/        — separate preorder conversion module
```

## Email Template Inventory

| Template | Function | Trigger |
|----------|----------|---------|
| Order confirmation | `generateConfirmationEmail()` | New order placed |
| Customer invite | `generateCustomerInviteEmail()` | Admin creates customer |
| Staff invite | `generateStaffInviteEmail()` | Admin invites staff |
| Magic-link registration | `generateMagicRegistrationEmail()` | Magic-link register |
| Magic-link login | `generateMagicLinkLoginEmail()` | Magic-link login |
| Email confirmation | `generateEmailConfirmationEmail()` | Password registration |
| Password reset | `generatePasswordResetEmail()` | Forgot password |
| Subscription created | `generateSubscriptionCreatedEmail()` | Subscription activated |
| Subscription paused | `generateSubscriptionPausedEmail()` | Subscription paused |
| Subscription resumed | `generateSubscriptionResumedEmail()` | Subscription resumed |
| Subscription cancelled | `generateSubscriptionCancelledEmail()` | Subscription cancelled |
| Delivery upcoming | `generateDeliveryUpcomingEmail()` | Delivery approaching |

## Label Resolution

Emails displaying personalization options (sports, flavors, colors, dietary) use `resolveEmailLabels()` from `lib/email/labels.ts` to fetch human-readable display names from the database. This prevents raw DB IDs from appearing in customer-facing emails.

## Adding a New Template

1. Create function using `wrapInEmailLayout()`, `emailCtaButton()`, `emailContactLine()` from `lib/email/layout.ts`
2. Import design tokens from `lib/email/constants.ts` — never hardcode colors
3. If email displays DB values (box types, options), call `resolveEmailLabels()` before generating
4. Send via `sendTransactionalEmail()` from `lib/email/brevo/transactional.ts`
5. Add to barrel export in `lib/email/index.ts`

## Required Environment Variables

Add these to your `.env.local` file:

| Variable | Description |
|----------|-------------|
| `BREVO_API_KEY` | Brevo API key (starts with `xkeysib-`) |
| `BREVO_SENDER_EMAIL` | Verified sender email |
| `BREVO_SENDER_NAME` | Sender display name |
| `BREVO_NEWSLETTER_LIST_ID` | (Optional) Contact list for marketing |

## Getting Your Brevo API Key

1. Log in to your [Brevo account](https://app.brevo.com/)
2. Go to **Settings** (gear icon) → **SMTP & API**
3. Click on **API Keys** tab
4. Click **Generate a new API key**
5. Give it a name
6. Copy the key and add it to your `.env.local` as `BREVO_API_KEY`

> ⚠️ **Important**: The API key is different from the SMTP key. Make sure you're using the API key (starts with `xkeysib-`).

## Verifying Your Sender Email

Before sending emails, you must verify your sender email/domain in Brevo:

1. Go to **Settings** → **Senders, Domains & Dedicated IPs**
2. Click **Add a sender**
3. Enter your sender email
4. Follow the verification steps (email verification or DNS records)

### For Production (Recommended)

Set up domain authentication for better deliverability:
1. Add your domain in Brevo
2. Add the required DNS records (SPF, DKIM, DMARC)
3. Wait for verification (can take up to 48 hours)

## Setting Up Contact Lists (Optional)

To enable marketing campaigns:

1. Go to **Contacts** → **Lists**
2. Create a new list (e.g., "Customers")
3. Note the List ID (visible in the URL or list details)
4. Add it to your `.env.local` as `BREVO_NEWSLETTER_LIST_ID`

## Troubleshooting

### "BREVO_API_KEY environment variable is not set"
- Ensure `.env.local` contains `BREVO_API_KEY`
- Restart the development server after adding env variables

### Emails not being delivered
1. Check Brevo Transactional Logs for errors
2. Verify sender email is authenticated
3. Check spam folders
4. Ensure domain DNS records are properly configured
