/**
 * Brevo API client configuration
 */

import * as Brevo from '@getbrevo/brevo';

// Singleton instance for the API clients
let transactionalEmailsApi: Brevo.TransactionalEmailsApi | null = null;
let contactsApi: Brevo.ContactsApi | null = null;
let emailCampaignsApi: Brevo.EmailCampaignsApi | null = null;

/**
 * Get the Brevo API key from environment variables
 */
function getApiKey(): string {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Get or create the Transactional Emails API instance
 */
export function getTransactionalEmailsApi(): Brevo.TransactionalEmailsApi {
  if (!transactionalEmailsApi) {
    transactionalEmailsApi = new Brevo.TransactionalEmailsApi();
    transactionalEmailsApi.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      getApiKey()
    );
  }
  return transactionalEmailsApi;
}

/**
 * Get or create the Contacts API instance
 */
export function getContactsApi(): Brevo.ContactsApi {
  if (!contactsApi) {
    contactsApi = new Brevo.ContactsApi();
    contactsApi.setApiKey(
      Brevo.ContactsApiApiKeys.apiKey,
      getApiKey()
    );
  }
  return contactsApi;
}

/**
 * Get or create the Email Campaigns API instance
 */
export function getEmailCampaignsApi(): Brevo.EmailCampaignsApi {
  if (!emailCampaignsApi) {
    emailCampaignsApi = new Brevo.EmailCampaignsApi();
    emailCampaignsApi.setApiKey(
      Brevo.EmailCampaignsApiApiKeys.apiKey,
      getApiKey()
    );
  }
  return emailCampaignsApi;
}

/**
 * Default sender configuration
 * Update these values with your verified sender email and name
 */
export const DEFAULT_SENDER = {
  email: process.env.BREVO_SENDER_EMAIL,
  name: process.env.BREVO_SENDER_NAME,
};

/**
 * Email configuration constants
 */
export const EMAIL_CONFIG = {
  // Default tags for tracking
  tags: {
    confirmation: 'confirmation',
    transactional: 'transactional',
    marketing: 'marketing',
  },
  // Contact list IDs (configure these in Brevo dashboard)
  lists: {
    legacyPreorders: Number(process.env.BREVO_PREORDER_LIST_ID) || 0,
    newsletter: Number(process.env.BREVO_NEWSLETTER_LIST_ID) || 0,
  },
  // Template IDs (configure these in Brevo dashboard)
  templates: {
    preorderConversion: Number(process.env.BREVO_TEMPLATE_PREORDER_CONVERSION) || 0,
  },
};
