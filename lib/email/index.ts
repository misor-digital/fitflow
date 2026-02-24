/**
 * Email Module — Barrel Exports
 *
 * Core email service + Brevo API wrappers + usage tracking
 */

// Core email service functions
export {
  sendEmail,
  sendTemplateEmail,
  createOrUpdateContact,
  addContactToList,
  getContactByEmail,
  EMAIL_CONFIG,
  DEFAULT_SENDER,
} from './emailService';



// Email templates and utilities
export {
  generateConfirmationEmail,
  generateOrderConfirmationEmail,
  formatOptionsWithOther,
} from './templates';

// Email template types
export type {
  LabelMap,
  EmailLabelMaps,
} from './templates';

// Types (existing + new)
export type {
  EmailRecipient,
  EmailSender,
  EmailAttachment,
  SendEmailOptions,
  SendTemplateEmailOptions,
  EmailResult,
  ContactData,
  ContactResult,
  ConfirmationEmailData,
  // New types
  EmailCampaignType,
  EmailCampaignStatus,
  EmailRecipientStatus,
  EmailLogStatus,
  EmailLogType,
  TargetListType,
  EmailSendLogInput,
  CampaignHistoryAction,
} from './types';

// Brevo API wrappers (new)
export * from './brevo';

// Usage tracking (new)
export { checkUsage, setUsageChecker, getWarningLevel } from './usage';
export type { UsageCheck, UsageChecker } from './usage';
