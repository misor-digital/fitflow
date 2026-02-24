/**
 * Contact Sync Service
 *
 * Centralizes all Brevo contact synchronization logic.
 * Called from API routes and services when user data changes.
 * Never throws — logs errors and returns result.
 *
 * Fire-and-forget pattern: sync calls must never block the primary operation.
 * If Brevo is down, the primary action succeeds; full sync recovers any drift.
 */

import {
  syncCustomerContact,
  syncSubscriptionToContact,
  syncOrderToContact,
  addToBrevoList,
  removeContactFromList,
} from './brevo/contacts';
import { EMAIL_CONFIG } from './client';
import type { ContactResult } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SyncNewUserData {
  email: string;
  firstName: string;
  lastName?: string;
}

export interface SyncOrderCustomerData {
  email: string;
  firstName?: string;
  orderDate: string;
  /** Total EUR for this order */
  totalEur?: number;
  boxType?: string;
}

export interface SyncSubscriptionChangeData {
  email: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  boxType?: string;
  frequency?: string;
}

export interface SyncPreorderData {
  email: string;
  fullName?: string;
  boxType?: string;
}

export interface SyncPreorderConvertedData {
  email: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Sync a newly registered user to Brevo.
 * Creates contact with FIRSTNAME, LASTNAME, REGISTRATION_DATE.
 * Adds to `customers` list.
 */
export async function syncNewUser(data: SyncNewUserData): Promise<SyncResult> {
  try {
    const listIds = EMAIL_CONFIG.lists.customers
      ? [EMAIL_CONFIG.lists.customers]
      : undefined;

    const result = await syncCustomerContact(
      data.email,
      data.firstName,
      data.lastName,
      {
        REGISTRATION_DATE: new Date().toISOString().split('T')[0],
      } as Record<string, string>,
      listIds,
    );

    if (!result.success) {
      console.error('[ContactSync] Failed to sync new user:', result.error);
    }
    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ContactSync] Unexpected error syncing new user:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync an order customer to Brevo.
 * Updates LAST_ORDER_DATE, ORDER_COUNT attributes.
 * Ensures contact is in `customers` list.
 */
export async function syncOrderCustomer(data: SyncOrderCustomerData): Promise<SyncResult> {
  try {
    const result = await syncOrderToContact(
      data.email,
      1, // Brevo-side ORDER_COUNT incremented per-sync; accurate count needs full sync
      data.orderDate.split('T')[0],
      data.boxType ?? '',
    );

    if (!result.success) {
      console.error('[ContactSync] Failed to sync order customer:', result.error);
    }

    // Ensure in customers list
    if (EMAIL_CONFIG.lists.customers) {
      await addToBrevoList(data.email, EMAIL_CONFIG.lists.customers).catch((err) =>
        console.error('[ContactSync] Failed to add order customer to list:', err),
      );
    }

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ContactSync] Unexpected error syncing order customer:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync subscription status change to Brevo.
 * Updates SUBSCRIBER, SUB_STATUS, SUB_BOX_TYPE attributes.
 * Active → add to `subscribers` list.
 * Cancelled/expired → remove from `subscribers` list.
 */
export async function syncSubscriptionChange(data: SyncSubscriptionChangeData): Promise<SyncResult> {
  try {
    const isActive = data.status === 'active';
    const result = await syncSubscriptionToContact(
      data.email,
      isActive,
      data.status,
      data.boxType,
    );

    if (!result.success) {
      console.error('[ContactSync] Failed to sync subscription change:', result.error);
    }

    // List management based on status
    if (EMAIL_CONFIG.lists.subscribers) {
      if (isActive) {
        await addToBrevoList(data.email, EMAIL_CONFIG.lists.subscribers).catch((err) =>
          console.error('[ContactSync] Failed to add to subscribers list:', err),
        );
      } else if (data.status === 'cancelled' || data.status === 'expired') {
        await removeContactFromList(data.email, EMAIL_CONFIG.lists.subscribers).catch((err) =>
          console.error('[ContactSync] Failed to remove from subscribers list:', err),
        );
      }
      // 'paused' stays in the list but with updated SUB_STATUS attribute
    }

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ContactSync] Unexpected error syncing subscription change:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a new preorder to Brevo.
 * Creates/updates contact with PREORDER_DATE, BOX_TYPE attributes.
 * Adds to `preorders` list.
 */
export async function syncPreorder(data: SyncPreorderData): Promise<SyncResult> {
  try {
    // Parse full name into first/last
    const nameParts = (data.fullName ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    const listIds = EMAIL_CONFIG.lists.preorders
      ? [EMAIL_CONFIG.lists.preorders]
      : undefined;

    const result = await syncCustomerContact(
      data.email,
      firstName,
      lastName,
      {
        PREORDER_DATE: new Date().toISOString().split('T')[0],
        ...(data.boxType && { BOX_TYPE: data.boxType }),
      } as Record<string, string>,
      listIds,
    );

    if (!result.success) {
      console.error('[ContactSync] Failed to sync preorder:', result.error);
    }
    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ContactSync] Unexpected error syncing preorder:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync a preorder conversion to Brevo.
 * Removes contact from `preorders` list. Updates CONVERTED_DATE attribute.
 */
export async function syncPreorderConverted(data: SyncPreorderConvertedData): Promise<SyncResult> {
  try {
    // Update CONVERTED_DATE attribute
    const result = await syncCustomerContact(
      data.email,
      '', // Don't overwrite name
      undefined,
      {
        CONVERTED_DATE: new Date().toISOString().split('T')[0],
      } as Record<string, string>,
    );

    if (!result.success) {
      console.error('[ContactSync] Failed to update converted date:', result.error);
    }

    // Remove from preorders list
    if (EMAIL_CONFIG.lists.preorders) {
      await removeContactFromList(data.email, EMAIL_CONFIG.lists.preorders).catch((err) =>
        console.error('[ContactSync] Failed to remove from preorders list:', err),
      );
    }

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ContactSync] Unexpected error syncing preorder conversion:', error);
    return { success: false, error: String(error) };
  }
}
