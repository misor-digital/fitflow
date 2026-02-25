/**
 * STANDALONE PREORDER CONVERSION CAMPAIGN
 *
 * This module is self-contained and can be fully removed when no longer needed.
 *
 * To remove:
 * 1. Delete this folder: lib/email/preorder-campaign/
 * 2. Delete the API route: app/api/admin/preorder-campaign/
 * 3. Delete the admin page: app/admin/preorder-campaign/
 * 4. Delete the admin component: components/admin/PreorderCampaignPage.tsx
 * 5. Remove the sidebar link in app/admin/AdminSidebar.tsx
 *
 * The email_send_log entries with category 'preorder-conversion' and
 * 'preorder-conversion-dry-run' can be kept for historical records.
 */

export { getEligiblePreorderRecipients } from './recipients';
export type { PreorderRecipient } from './recipients';

export { renderPreorderEmail } from './template';

export { sendPreorderConversionEmails } from './send';
export type { SendResult } from './send';
