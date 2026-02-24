/**
 * Email service module for FitFlow
 * Uses Brevo API for transactional emails and contact management
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

// Types
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
} from './types';
