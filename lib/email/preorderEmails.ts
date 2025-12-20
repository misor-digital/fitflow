/**
 * Preorder-specific email functions
 * High-level functions for sending preorder-related emails
 */

import { sendEmail, createOrUpdateContact, addContactToList, EMAIL_CONFIG } from './emailService';
import { generatePreorderConfirmationEmail, getBoxTypeDisplayName } from './templates';
import type { EmailResult, ContactResult, PreorderEmailData } from './types';
import type { Preorder } from '@/lib/supabase/types';

/**
 * Send preorder confirmation email to customer
 */
export async function sendPreorderConfirmationEmail(
  preorder: Preorder
): Promise<EmailResult> {
  // Prepare email data
  const emailData: PreorderEmailData = {
    fullName: preorder.full_name,
    email: preorder.email,
    boxType: preorder.box_type,
    boxTypeDisplay: getBoxTypeDisplayName(preorder.box_type),
    wantsPersonalization: preorder.wants_personalization,
    preorderId: preorder.order_id,
    sports: preorder.sports || undefined,
    colors: preorder.colors || undefined,
    contents: preorder.contents || undefined,
    flavors: preorder.flavors || undefined,
    sizeUpper: preorder.size_upper || undefined,
    sizeLower: preorder.size_lower || undefined,
    dietary: preorder.dietary || undefined,
    additionalNotes: preorder.additional_notes || undefined,
  };

  // Generate email content
  const htmlContent = generatePreorderConfirmationEmail(emailData);

  // Send the email
  const result = await sendEmail({
    to: {
      email: preorder.email,
      name: preorder.full_name,
    },
    subject: 'Потвърждение на предварителна поръчка - FitFlow',
    htmlContent,
    tags: [EMAIL_CONFIG.tags.preorder, EMAIL_CONFIG.tags.confirmation, EMAIL_CONFIG.tags.transactional],
  });

  if (result.success) {
    console.log(`Preorder confirmation email sent to ${preorder.email}, messageId: ${result.messageId}`);
  } else {
    console.error(`Failed to send preorder confirmation email to ${preorder.email}:`, result.error);
  }

  return result;
}

/**
 * Add preorder customer to Brevo contacts and preorder list
 * This enables future marketing campaigns
 */
export async function addPreorderCustomerToContacts(
  preorder: Preorder
): Promise<ContactResult> {
  // Parse name into first and last name
  const nameParts = preorder.full_name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Create or update contact with preorder attributes
  const result = await createOrUpdateContact({
    email: preorder.email,
    firstName,
    lastName,
    attributes: {
      BOX_TYPE: preorder.box_type,
      WANTS_PERSONALIZATION: preorder.wants_personalization,
      PREORDER_ID: preorder.order_id,
      PREORDER_DATE: preorder.created_at,
      PHONE: preorder.phone || '',
      // Store preferences as JSON strings for complex data
      SPORTS: preorder.sports?.join(', ') || '',
      COLORS: preorder.colors?.join(', ') || '',
      SIZE_UPPER: preorder.size_upper || '',
      SIZE_LOWER: preorder.size_lower || '',
    },
    listIds: EMAIL_CONFIG.lists.preorders > 0 ? [EMAIL_CONFIG.lists.preorders] : undefined,
    updateEnabled: true,
  });

  if (result.success) {
    console.log(`Contact ${preorder.email} added/updated in Brevo`);
    
    // If preorder list is configured, ensure contact is added
    if (EMAIL_CONFIG.lists.preorders > 0) {
      await addContactToList(preorder.email, EMAIL_CONFIG.lists.preorders);
    }
  } else {
    console.error(`Failed to add contact ${preorder.email} to Brevo:`, result.error);
  }

  return result;
}

/**
 * Complete preorder email workflow:
 * 1. Send confirmation email
 * 2. Add customer to contacts/mailing list
 * 
 * This is the main function to call after a successful preorder
 */
export async function handlePreorderEmailWorkflow(
  preorder: Preorder
): Promise<{ emailResult: EmailResult; contactResult: ContactResult }> {
  console.log(`Starting email workflow for preorder ${preorder.id}`);

  // Send confirmation email
  const emailResult = await sendPreorderConfirmationEmail(preorder);

  // Add to contacts (don't fail the whole workflow if this fails)
  const contactResult = await addPreorderCustomerToContacts(preorder);

  console.log(`Email workflow completed for preorder ${preorder.id}:`, {
    emailSent: emailResult.success,
    contactAdded: contactResult.success,
  });

  return { emailResult, contactResult };
}
