# Email Service Setup Guide - Brevo Integration

This document describes how to set up and configure the Brevo email service.

## Overview

This app uses [Brevo](https://www.brevo.com/) (formerly Sendinblue) for:
- **Transactional emails**: Preorder confirmations, order updates, etc.
- **Contact management**: Building a customer database for future marketing
- **Campaign capability**: Ready for future marketing campaigns and newsletters

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Required - Brevo API Key
BREVO_API_KEY=your-brevo-api-key-here
BREVO_SENDER_EMAIL=your-email
BREVO_SENDER_NAME=your-business-name

# Optional - Contact List IDs (for marketing campaigns)
BREVO_PREORDER_LIST_ID=0
BREVO_NEWSLETTER_LIST_ID=0

# Optional - Template IDs (if using Brevo templates)
BREVO_PREORDER_TEMPLATE_ID=0
```

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
2. Create a new list (e.g., "Preorder Customers")
3. Note the List ID (visible in the URL or list details)
4. Add it to your `.env.local` as `BREVO_PREORDER_LIST_ID`

## Using Brevo Templates (Optional)

Instead of inline HTML templates, you can use Brevo's template editor:

1. Go to **Campaigns** → **Templates**
2. Create a new template
3. Design your email using the drag-and-drop editor
4. Use template variables like `{{ params.FULLNAME }}`, `{{ params.BOXTYPE }}`
5. Note the Template ID
6. Add it to your `.env.local` as `BREVO_PREORDER_TEMPLATE_ID`

### Template Variables Available

When using templates, these variables are passed:
- `FULLNAME` - Customer's full name
- `EMAIL` - Customer's email
- `BOXTYPE` - Selected box type
- `BOXTYPEDISPLAY` - Human-readable box type name
- `PREORDERID` - Unique preorder ID
- `WANTSPERSONALIZATION` - Boolean
- `SPORTS`, `COLORS`, `CONTENTS`, `FLAVORS` - Preferences (comma-separated)
- `SIZEUPPER`, `SIZELOWER` - Size preferences
- `DIETARY` - Dietary preferences
- `ADDITIONALNOTES` - Customer notes

## Architecture

```
lib/email/
├── index.ts           # Main exports
├── types.ts           # TypeScript interfaces
├── client.ts          # Brevo API client configuration
├── emailService.ts    # Core email sending functions
├── templates.ts       # HTML email templates
└── preorderEmails.ts  # Preorder-specific email functions
```

## Usage Examples

### Send a Custom Email

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: { email: 'customer@example.com', name: 'John Doe' },
  subject: 'Welcome!',
  htmlContent: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  textContent: 'Welcome! Thanks for joining.',
  tags: ['welcome', 'transactional'],
});
```

### Send Preorder Confirmation

```typescript
import { handlePreorderEmailWorkflow } from '@/lib/email';

// After saving preorder to database
const { emailResult, contactResult } = await handlePreorderEmailWorkflow(preorder);
```

### Add Contact to List

```typescript
import { createOrUpdateContact, addContactToList } from '@/lib/email';

await createOrUpdateContact({
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  attributes: {
    SIGNUP_SOURCE: 'website',
  },
  listIds: [123], // Your list ID
});
```

## Testing

### Test Email Sending

```bash
# Run the development server
pnpm dev

# Submit a test preorder through the UI
# Check Brevo dashboard for sent emails
```

### Check Brevo Dashboard

1. **Transactional** → **Logs**: View sent emails and delivery status
2. **Contacts**: View added contacts
3. **Statistics**: Monitor email performance

## Troubleshooting

### "BREVO_API_KEY environment variable is not set"
- Ensure `.env.local` contains `BREVO_API_KEY`
- Restart the development server after adding env variables

### Emails not being delivered
1. Check Brevo Transactional Logs for errors
2. Verify sender email is authenticated
3. Check spam folders
4. Ensure domain DNS records are properly configured

### Contact not being added
1. Check if contact already exists (Brevo may return error)
2. Verify list ID is correct
3. Check Brevo API response in server logs

## Rate Limits

Brevo free tier includes:
- 300 emails/day
- Unlimited contacts

For production, consider upgrading to a paid plan for:
- Higher email limits
- Better deliverability
- Advanced analytics
- Dedicated IP

## Future Enhancements

The email service is designed to support:
- [ ] Marketing campaigns via Brevo Campaigns API
- [ ] Email automation workflows
- [ ] A/B testing for email templates
- [ ] Advanced segmentation based on customer preferences
- [ ] Webhook integration for delivery tracking
