/**
 * Speedy Shipment/Waybill Creation
 *
 * Maps FitFlow orders to Speedy API shipment requests.
 * Server-only module used by admin dispatch workflows.
 */

import 'server-only';

import { createShipment } from './client';
import { getSpeedySenderConfig } from './config';
import { getDeliveryConfigMap } from '@/lib/data';
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
  /** Box price in EUR (excluding delivery fee) */
  finalPriceEur: number;
  /** Delivery fee in EUR */
  deliveryFeeEur: number;
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

const FALLBACK_PARCEL = {
  weight: 1.36,
  size: { width: 19, depth: 26.5, height: 10 },
  contents: 'КУТИЯ СЪС СПОРТНИ СТОКИ',
  package: 'КАШОН',
};

interface ParcelConfig {
  weight: number;
  size: { width: number; depth: number; height: number };
  contents: string;
  package: string;
}

/** Read parcel config from DB, falling back to hardcoded defaults. */
async function getParcelConfig(): Promise<ParcelConfig> {
  try {
    const configMap = await getDeliveryConfigMap();
    return {
      weight: parseFloat(configMap.PARCEL_WEIGHT_KG ?? '') || FALLBACK_PARCEL.weight,
      size: {
        width: parseFloat(configMap.PARCEL_WIDTH_CM ?? '') || FALLBACK_PARCEL.size.width,
        depth: parseFloat(configMap.PARCEL_DEPTH_CM ?? '') || FALLBACK_PARCEL.size.depth,
        height: parseFloat(configMap.PARCEL_HEIGHT_CM ?? '') || FALLBACK_PARCEL.size.height,
      },
      contents: configMap.PARCEL_CONTENTS || FALLBACK_PARCEL.contents,
      package: configMap.PARCEL_PACKAGE || FALLBACK_PARCEL.package,
    };
  } catch {
    return FALLBACK_PARCEL;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a Speedy waybill for a single FitFlow order.
 */
export async function createWaybillForOrder(order: OrderForShipment): Promise<WaybillResult> {
  const parcel = await getParcelConfig();
  const params = await buildShipmentRequest(order, parcel);
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
export async function buildShipmentRequest(order: OrderForShipment, parcel: ParcelConfig = FALLBACK_PARCEL): Promise<CreateShipmentParams> {
  const config = await getSpeedySenderConfig();
  const recipient = buildRecipient(order);

  // COD amount = box price + delivery fee (what the customer pays on delivery)
  const codAmountEur = order.finalPriceEur + order.deliveryFeeEur;

  return {
    sender: {
      clientId: config.clientId,
      dropoffOfficeId: config.dropoffOfficeId,
    },
    recipient,
    service: {
      serviceId: config.serviceId,
      autoAdjustPickupDate: true,
      additionalServices: {
        cod: {
          amount: codAmountEur,
          processingType: 'CASH',
        },
        declaredValue: {
          amount: codAmountEur,
          fragile: true,
        },
      },
    },
    content: {
      parcelsCount: 1,
      totalWeight: parcel.weight,
      contents: parcel.contents,
      package: parcel.package,
      parcels: [
        {
          seqNo: 1,
          weight: parcel.weight,
          size: parcel.size,
          ref1: order.readableId || order.id,
        },
      ],
    },
    payment: {
      courierServicePayer: 'SENDER',
      declaredValuePayer: 'SENDER',
    },
    ref1: order.readableId || order.id,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildRecipient(order: OrderForShipment): ShipmentParty {
  const addr = order.shippingAddress;
  const phone = normalizePhoneBG(addr.phone || order.userPhone);
  const contactName = `${addr.first_name} ${addr.last_name}`.trim();

  if (order.deliveryMethod === 'speedy_office' || order.deliveryMethod === 'speedy_automat') {
    return {
      phone1: { number: phone },
      clientName: contactName,
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
    clientName: contactName,
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

/**
 * Normalize a Bulgarian phone number for Speedy API.
 * Speedy requires: digits only, may start with "+" or "0".
 * Valid examples from docs: +359999123456, 0999123456, 0040799123456
 * We always output +359XXXXXXXXX format for reliability.
 */
function normalizePhoneBG(raw: string): string {
  // Strip everything except digits and leading +
  const cleaned = raw.trim();
  let digits = cleaned.replace(/[^\d]/g, '');

  // Convert to raw subscriber digits (without country code or leading 0)
  if (digits.startsWith('00359')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('359') && digits.length >= 11) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Output in international format with + prefix
  return `+359${digits}`;
}
