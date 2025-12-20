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

// Preorder-specific email functions
export {
  sendPreorderConfirmationEmail,
  addPreorderCustomerToContacts,
  handlePreorderEmailWorkflow,
} from './preorderEmails';

// Email templates and display name helpers
export {
  generatePreorderConfirmationEmail,
  getBoxTypeDisplayName,
  getSportDisplayName,
  getSportsDisplayNames,
  getContentDisplayName,
  getFlavorDisplayName,
  getFlavorsDisplayNames,
  getDietaryDisplayName,
  getDietaryDisplayNames,
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
  PreorderEmailData,
} from './types';
