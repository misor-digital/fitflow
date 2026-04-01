/**
 * STANDALONE ORDER-TO-SUBSCRIPTION CONVERSION CAMPAIGN
 *
 * This module is self-contained and can be fully removed when no longer needed.
 *
 * To remove:
 * 1. Delete this folder: lib/email/order-subscription-campaign/
 * 2. Delete any associated API routes and admin pages
 * 3. Remove any sidebar links
 *
 * The email_send_log entries with category 'order-to-sub-conversion' and
 * 'order-to-sub-conversion-dry-run' can be kept for historical records.
 */

export { getEligibleOrderConversionRecipients } from './recipients';
export type { OrderConversionRecipient } from './recipients';

export { renderOrderConversionEmail } from './template';

export { sendOrderConversionEmails } from './send';
export type { OrderConversionSendResult } from './send';
