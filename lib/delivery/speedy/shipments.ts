/**
 * Speedy Shipment/Waybill Creation
 *
 * Maps FitFlow orders to Speedy API shipment requests.
 * Server-only module used by admin dispatch workflows.
 */

import 'server-only';

import { createShipment } from './client';
import { getSpeedySenderConfig } from './config';
import type { CreateShipmentParams, ShipmentParty, SpeedyAddress } from './types';

// ============================================================================
// Types
// ============================================================================

export interface OrderForShipment {
  id: string;
  deliveryMethod: 'address' | 'speedy_office' | 'speedy_automat';
  shippingAddress: {
    first_name: string;
    last_name: string;
    phone: string | null;
    city?: string;
    postal_code?: string;
    street_address?: string;
    building_entrance?: string | null;
    floor?: string | null;
    apartment?: string | null;
    delivery_notes?: string | null;
    speedy_office_id?: string;
    speedy_office_name?: string;
    speedy_office_address?: string;
  };
  userEmail: string;
  userPhone: string;
  readableId?: string;
}

export interface WaybillResult {
  waybillId: string;
  parcelIds: string[];
  pickupDate: string;
  deliveryDeadline: string;
  actualCost: {
    amount: number;
    vat: number;
    total: number;
    currency: string;
  };
}

// ============================================================================
// Default parcel specs
// ============================================================================

const DEFAULT_PARCEL = {
  weight: 2.5,
  size: { width: 30, depth: 30, height: 15 },
  contents: 'Фитнес кутия',
  package: 'BOX',
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a Speedy waybill for a single FitFlow order.
 */
export async function createWaybillForOrder(order: OrderForShipment): Promise<WaybillResult> {
  const params = buildShipmentRequest(order);
  const response = await createShipment(params);

  return {
    waybillId: response.id,
    parcelIds: response.parcels.map((p) => p.id),
    pickupDate: response.pickupDate,
    deliveryDeadline: response.deliveryDeadline,
    actualCost: response.price,
  };
}

/**
 * Build Speedy shipment params from a FitFlow order.
 */
export function buildShipmentRequest(order: OrderForShipment): CreateShipmentParams {
  const config = getSpeedySenderConfig();
  const recipient = buildRecipient(order);

  return {
    sender: {
      clientId: config.clientId,
    },
    recipient,
    service: {
      serviceId: config.serviceId,
      autoAdjustPickupDate: true,
    },
    content: {
      parcelsCount: 1,
      totalWeight: DEFAULT_PARCEL.weight,
      contents: DEFAULT_PARCEL.contents,
      package: DEFAULT_PARCEL.package,
      parcels: [
        {
          seqNo: 1,
          weight: DEFAULT_PARCEL.weight,
          size: DEFAULT_PARCEL.size,
          ref1: order.readableId || order.id,
        },
      ],
    },
    payment: {
      courierServicePayer: 'SENDER',
    },
    ref1: order.readableId || order.id,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildRecipient(order: OrderForShipment): ShipmentParty {
  const addr = order.shippingAddress;
  const phone = addr.phone || order.userPhone;
  const contactName = `${addr.first_name} ${addr.last_name}`.trim();

  if (order.deliveryMethod === 'speedy_office' || order.deliveryMethod === 'speedy_automat') {
    return {
      phone1: { number: phone },
      contactName,
      email: order.userEmail,
      privatePerson: true,
      pickupOfficeId: Number(addr.speedy_office_id),
    };
  }

  // Home address delivery — use addressNote approach
  const address: SpeedyAddress = {
    countryId: 100, // Bulgaria
    siteName: addr.city?.toUpperCase(),
    postCode: addr.postal_code,
    addressNote: buildAddressNote(addr),
  };

  return {
    phone1: { number: phone },
    contactName,
    email: order.userEmail,
    privatePerson: true,
    address,
  };
}

function buildAddressNote(addr: OrderForShipment['shippingAddress']): string {
  const parts: string[] = [];
  if (addr.street_address) parts.push(addr.street_address);
  if (addr.building_entrance) parts.push(`вх. ${addr.building_entrance}`);
  if (addr.floor) parts.push(`ет. ${addr.floor}`);
  if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
  if (addr.delivery_notes) parts.push(`(${addr.delivery_notes})`);
  return parts.filter(Boolean).join(', ');
}
