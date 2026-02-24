/**
 * Email service for sending transactional emails via Brevo API
 */

import * as Brevo from '@getbrevo/brevo';
import { getTransactionalEmailsApi, getContactsApi, DEFAULT_SENDER, EMAIL_CONFIG } from './client';
import type {
  SendEmailOptions,
  SendTemplateEmailOptions,
  EmailResult,
  ContactData,
  ContactResult,
  EmailRecipient,
} from './types';

// Type for Brevo recipient format
interface BrevoRecipient {
  email: string;
  name?: string;
}

/**
 * Convert EmailRecipient to Brevo format
 */
function toBrevoRecipient(recipient: EmailRecipient | EmailRecipient[]): BrevoRecipient[] {
  const recipients = Array.isArray(recipient) ? recipient : [recipient];
  return recipients.map((r) => ({
    email: r.email,
    name: r.name,
  }));
}

/**
 * Send a transactional email with custom HTML content
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const api = getTransactionalEmailsApi();
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.to = toBrevoRecipient(options.to);
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.sender = options.sender || DEFAULT_SENDER;
    
    if (options.htmlContent) {
      sendSmtpEmail.htmlContent = options.htmlContent;
    }
    if (options.textContent) {
      sendSmtpEmail.textContent = options.textContent;
    }
    if (options.replyTo) {
      sendSmtpEmail.replyTo = options.replyTo;
    }
    if (options.cc) {
      sendSmtpEmail.cc = toBrevoRecipient(options.cc);
    }
    if (options.bcc) {
      sendSmtpEmail.bcc = toBrevoRecipient(options.bcc);
    }
    if (options.tags) {
      sendSmtpEmail.tags = options.tags;
    }
    if (options.params) {
      sendSmtpEmail.params = options.params;
    }
    if (options.attachments) {
      sendSmtpEmail.attachment = options.attachments.map((att) => ({
        name: att.name,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const response = await api.sendTransacEmail(sendSmtpEmail);
    
    console.log('Email sent successfully:', response.body);
    
    return {
      success: true,
      messageId: response.body.messageId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}

/**
 * Send a transactional email using a Brevo template
 * Templates can be created and managed in the Brevo dashboard
 */
export async function sendTemplateEmail(options: SendTemplateEmailOptions): Promise<EmailResult> {
  try {
    const api = getTransactionalEmailsApi();
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.to = toBrevoRecipient(options.to);
    sendSmtpEmail.templateId = options.templateId;
    sendSmtpEmail.sender = options.sender || DEFAULT_SENDER;
    
    if (options.params) {
      sendSmtpEmail.params = options.params;
    }
    if (options.replyTo) {
      sendSmtpEmail.replyTo = options.replyTo;
    }
    if (options.cc) {
      sendSmtpEmail.cc = toBrevoRecipient(options.cc);
    }
    if (options.bcc) {
      sendSmtpEmail.bcc = toBrevoRecipient(options.bcc);
    }
    if (options.tags) {
      sendSmtpEmail.tags = options.tags;
    }
    if (options.attachments) {
      sendSmtpEmail.attachment = options.attachments.map((att) => ({
        name: att.name,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const response = await api.sendTransacEmail(sendSmtpEmail);
    
    console.log('Template email sent successfully:', response.body);
    
    return {
      success: true,
      messageId: response.body.messageId,
    };
  } catch (error) {
    console.error('Error sending template email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending template email',
    };
  }
}

/**
 * Create or update a contact in Brevo
 * Useful for adding customers to mailing lists
 */
export async function createOrUpdateContact(data: ContactData): Promise<ContactResult> {
  try {
    const api = getContactsApi();
    
    const createContact = new Brevo.CreateContact();
    createContact.email = data.email;
    createContact.updateEnabled = data.updateEnabled ?? true;
    
    // Build attributes object
    const attributes: Record<string, string | number | boolean | string[]> = {};
    if (data.firstName) {
      attributes['FIRSTNAME'] = data.firstName;
    }
    if (data.lastName) {
      attributes['LASTNAME'] = data.lastName;
    }
    if (data.attributes) {
      Object.assign(attributes, data.attributes);
    }
    
    if (Object.keys(attributes).length > 0) {
      createContact.attributes = attributes;
    }
    
    if (data.listIds && data.listIds.length > 0) {
      createContact.listIds = data.listIds;
    }

    const response = await api.createContact(createContact);
    
    console.log('Contact created/updated successfully:', response.body);
    
    return {
      success: true,
      contactId: response.body.id?.toString(),
    };
  } catch (error) {
    // Brevo returns 400 if contact already exists and updateEnabled is false
    // We can handle this gracefully
    console.error('Error creating/updating contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating contact',
    };
  }
}

/**
 * Add a contact to a specific list
 */
export async function addContactToList(email: string, listId: number): Promise<ContactResult> {
  try {
    const api = getContactsApi();
    
    const contactEmails = new Brevo.AddContactToList();
    contactEmails.emails = [email];
    
    await api.addContactToList(listId, contactEmails);
    
    console.log(`Contact ${email} added to list ${listId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error adding contact to list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding contact to list',
    };
  }
}

/**
 * Get contact information by email
 */
export async function getContactByEmail(email: string): Promise<{ success: boolean; contact?: unknown; error?: string }> {
  try {
    const api = getContactsApi();
    
    const response = await api.getContactInfo(email);
    
    return {
      success: true,
      contact: response.body,
    };
  } catch (error) {
    console.error('Error getting contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting contact',
    };
  }
}

// Re-export config for convenience
export { EMAIL_CONFIG, DEFAULT_SENDER };
