/**
 * Brevo Contacts API Wrapper
 *
 * Higher-level wrapper for contact management —
 * syncing customers, managing lists, and bulk operations.
 */

import { createOrUpdateContact, addContactToList, getContactByEmail } from '../emailService';
import type { ContactData, ContactResult } from '../types';

/** Standard Brevo contact attributes for FitFlow customers */
export interface FitFlowContactAttributes {
  FIRSTNAME?: string;
  LASTNAME?: string;
  USER_TYPE?: 'customer' | 'staff';
  SUBSCRIBER?: boolean;
  SUB_STATUS?: string;
  SUB_BOX_TYPE?: string;
  ORDER_COUNT?: number;
  LAST_ORDER_DATE?: string;
  BOX_TYPE?: string;
}

/**
 * Sync a FitFlow customer to Brevo contacts
 * Creates or updates with standard attributes
 */
export async function syncCustomerContact(
  email: string,
  firstName: string,
  lastName: string | undefined,
  attributes?: Partial<FitFlowContactAttributes>,
  listIds?: number[]
): Promise<ContactResult> {
  const contactData: ContactData = {
    email,
    firstName,
    lastName,
    attributes: attributes as Record<string, string | number | boolean | string[]>,
    listIds,
    updateEnabled: true,
  };

  return createOrUpdateContact(contactData);
}

/**
 * Sync subscription status to Brevo contact attributes
 */
export async function syncSubscriptionToContact(
  email: string,
  isSubscriber: boolean,
  subscriptionStatus?: string,
  boxType?: string
): Promise<ContactResult> {
  return createOrUpdateContact({
    email,
    attributes: {
      SUBSCRIBER: isSubscriber,
      ...(subscriptionStatus && { SUB_STATUS: subscriptionStatus }),
      ...(boxType && { SUB_BOX_TYPE: boxType }),
    },
    updateEnabled: true,
  });
}

/**
 * Sync order data to Brevo contact attributes
 */
export async function syncOrderToContact(
  email: string,
  orderCount: number,
  lastOrderDate: string,
  boxType: string
): Promise<ContactResult> {
  return createOrUpdateContact({
    email,
    attributes: {
      ORDER_COUNT: orderCount,
      LAST_ORDER_DATE: lastOrderDate,
      BOX_TYPE: boxType,
    },
    updateEnabled: true,
  });
}

/**
 * Add a contact to a Brevo list
 */
export async function addToBrevoList(email: string, listId: number): Promise<ContactResult> {
  return addContactToList(email, listId);
}

/**
 * Check if a contact exists in Brevo
 */
export async function getBrevoContact(email: string) {
  return getContactByEmail(email);
}
