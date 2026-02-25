/**
 * Brevo Contacts API Wrapper
 *
 * Higher-level wrapper for contact management —
 * syncing customers, managing lists, and bulk operations.
 */

import * as Brevo from '@getbrevo/brevo';
import { createOrUpdateContact, addContactToList, getContactByEmail } from '../emailService';
import { getContactsApi } from '../client';
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

// ============================================================================
// List management
// ============================================================================

/**
 * Remove a contact from a specific Brevo list.
 * Uses Brevo API: POST /contacts/lists/{listId}/contacts/remove
 */
export async function removeContactFromList(
  email: string,
  listId: number,
): Promise<ContactResult> {
  try {
    const api = getContactsApi();
    const contactEmails = new Brevo.RemoveContactFromList();
    contactEmails.emails = [email];
    await api.removeContactFromList(listId, contactEmails);
    console.log(`[Brevo] Contact ${email} removed from list ${listId}`);
    return { success: true };
  } catch (error) {
    console.error('[Brevo] Error removing contact from list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing contact from list',
    };
  }
}

/** Shape returned by getBrevoLists */
export interface BrevoListInfo {
  id: number;
  name: string;
  totalSubscribers: number;
  totalBlacklisted: number;
}

/**
 * Get all Brevo lists with contact counts.
 * Uses Brevo API: GET /contacts/lists
 */
export async function getBrevoLists(): Promise<{
  lists: BrevoListInfo[];
}> {
  try {
    const api = getContactsApi();
    const response = await api.getLists();
    const rawLists = (response.body as { lists?: Array<Record<string, unknown>> }).lists ?? [];
    const lists: BrevoListInfo[] = rawLists.map((l) => ({
      id: Number(l.id),
      name: String(l.name ?? ''),
      totalSubscribers: Number(l.totalSubscribers ?? 0),
      totalBlacklisted: Number(l.totalBlacklisted ?? 0),
    }));
    return { lists };
  } catch (error) {
    console.error('[Brevo] Error fetching lists:', error);
    return { lists: [] };
  }
}

/** A single contact entry from a Brevo list */
export interface BrevoListContact {
  email: string;
  attributes: Record<string, unknown>;
}

/**
 * Get contacts from a specific list with pagination.
 * Uses Brevo API: GET /contacts/lists/{listId}/contacts
 */
export async function getListContacts(
  listId: number,
  limit: number = 50,
  offset: number = 0,
): Promise<{ contacts: BrevoListContact[]; count: number }> {
  try {
    const api = getContactsApi();
    const response = await api.getContactsFromList(listId, undefined, limit, offset);
    const body = response.body as unknown as { contacts?: Array<Record<string, unknown>>; count?: number };
    const contacts: BrevoListContact[] = (body.contacts ?? []).map((c) => ({
      email: String(c.email ?? ''),
      attributes: (c.attributes as Record<string, unknown>) ?? {},
    }));
    return { contacts, count: Number(body.count ?? 0) };
  } catch (error) {
    console.error('[Brevo] Error fetching list contacts:', error);
    return { contacts: [], count: 0 };
  }
}
