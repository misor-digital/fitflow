/**
 * Speedy Courier API Types
 *
 * Type definitions for the Speedy.bg REST API v1.
 * Reference: https://api.speedy.bg/web-api.html
 */

// ============================================================================
// Auth & Base
// ============================================================================

export interface SpeedyCredentials {
  userName: string;
  password: string;
}

/** All Speedy API requests include credentials + optional language */
export interface SpeedyRequestBase {
  userName: string;
  password: string;
  language?: string;
}

// ============================================================================
// Error
// ============================================================================

export interface SpeedyErrorBody {
  error: {
    message: string;
    context?: string;
    id?: string;
    code?: number;
    component?: string;
  };
}

// ============================================================================
// Address & Location
// ============================================================================

export interface SpeedyAddress {
  countryId: number;
  siteId?: number;
  siteName?: string;
  postCode?: string;
  streetId?: number;
  streetType?: string;
  streetName?: string;
  streetNo?: string;
  complexId?: number;
  complexType?: string;
  complexName?: string;
  blockNo?: string;
  entranceNo?: string;
  floorNo?: string;
  apartmentNo?: string;
  poiId?: number;
  addressNote?: string;
  addressLine1?: string;
  addressLine2?: string;
}

export interface SpeedyOffice {
  id: number;
  name: string;
  nameEn: string;
  siteId: number;
  address: {
    fullAddressString: string;
    siteId: number;
    siteName: string;
    postCode: string;
    countryId: number;
  };
  workingTimeSchedule?: unknown;
  type: string; // 'OFFICE' | 'APT' (automat/locker)
  nearbyOfficeId?: number;
}

export interface SpeedySite {
  id: number;
  name: string;
  nameEn?: string;
  municipality?: string;
  region?: string;
  postCode?: string;
  countryId: number;
  type?: string;
}

// ============================================================================
// Shipment Parties
// ============================================================================

export interface ShipmentParty {
  phone1?: { number: string };
  contactName?: string;
  clientName?: string;
  email?: string;
  privatePerson?: boolean;
  clientId?: number;
  address?: SpeedyAddress;
  pickupOfficeId?: number;
  dropoffOfficeId?: number;
}

// ============================================================================
// Shipment Service & Content
// ============================================================================

export interface ShipmentService {
  serviceId: number;
  /** yyyy-MM-dd; defaults to today on Speedy's side */
  pickupDate?: string;
  autoAdjustPickupDate?: boolean;
  additionalServices?: ShipmentAdditionalServices;
}

export interface ShipmentAdditionalServices {
  cod?: {
    amount: number;
    processingType?: string;
  };
  declaredValue?: {
    amount: number;
    fragile?: boolean;
  };
}

export interface ShipmentParcel {
  seqNo: number;
  weight: number;
  size?: { width: number; depth: number; height: number };
  ref1?: string;
}

export interface ShipmentContent {
  parcelsCount: number;
  totalWeight: number;
  contents: string;
  package: string;
  parcels?: ShipmentParcel[];
}

export interface ShipmentPayment {
  courierServicePayer: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  declaredValuePayer?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  packagePayer?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  thirdPartyClientId?: number;
}

// ============================================================================
// Request / Response — Find Office
// ============================================================================

export interface FindOfficeParams {
  countryId?: number;
  siteId?: number;
  name?: string;
}

export interface FindOfficeResponse {
  offices: SpeedyOffice[];
}

// ============================================================================
// Request / Response — Find Site
// ============================================================================

export interface FindSiteParams {
  countryId: number;
  name?: string;
  postCode?: string;
}

export interface FindSiteResponse {
  sites: SpeedySite[];
}

// ============================================================================
// Request / Response — Create Shipment
// ============================================================================

export interface CreateShipmentParams {
  sender: ShipmentParty;
  recipient: ShipmentParty;
  service: ShipmentService;
  content: ShipmentContent;
  payment: ShipmentPayment;
  ref1?: string;
  ref2?: string;
}

export interface CreateShipmentResponse {
  id: string;
  parcels: Array<{
    id: string;
    seqNo: number;
  }>;
  price: {
    amount: number;
    vat: number;
    total: number;
    currency: string;
  };
  pickupDate: string;
  deliveryDeadline: string;
}

// ============================================================================
// Request / Response — Calculate
// ============================================================================

export interface CalculationSender {
  clientId?: number;
  privatePerson?: boolean;
  addressLocation?: CalculationAddressLocation;
  dropoffOfficeId?: number;
}

export interface CalculationAddressLocation {
  countryId?: number;
  siteId?: number;
  siteName?: string;
  postCode?: string;
}

export interface CalculationRecipient {
  clientId?: number;
  privatePerson?: boolean;
  addressLocation?: CalculationAddressLocation;
  pickupOfficeId?: number;
}

export interface CalculationService {
  serviceIds: number[];
  pickupDate?: string;
  autoAdjustPickupDate?: boolean;
  additionalServices?: ShipmentAdditionalServices;
}

export interface CalculateParams {
  sender: CalculationSender;
  recipient: CalculationRecipient;
  service: CalculationService;
  content: ShipmentContent;
  payment: ShipmentPayment;
}

export interface CalculateResponse {
  calculations: Array<{
    serviceId: number;
    price: {
      amount: number;
      vat: number;
      total: number;
      currency: string;
    };
    deliveryDeadline: string;
    pickupDate: string;
    error?: SpeedyErrorBody['error'];
  }>;
}

// ============================================================================
// Request / Response — Print (Label)
// ============================================================================

export interface PrintParams {
  paperSize: 'A4' | 'A6' | 'A4_4xA6';
  parcels: Array<{ parcel: { id: string } }>;
  additionalWaybillSenderCopy?: 'NONE' | 'ON_SAME_PAGE' | 'ON_SINGLE_PAGE';
}

// Response is binary PDF (ArrayBuffer)

// ============================================================================
// Request / Response — Track
// ============================================================================

export interface TrackParams {
  parcels: Array<{ id: string }>;
  lastOperationOnly?: boolean;
}

export interface TrackingOperation {
  dateTime: string;
  operationCode: number;
  description: string;
  place: string;
  comment?: string;
}

export interface TrackResponse {
  parcels: Array<{
    id: string;
    operations: TrackingOperation[];
  }>;
}

// ============================================================================
// Request / Response — Cancel Shipment
// ============================================================================

export interface CancelShipmentParams {
  shipmentId: string;
  comment: string;
}

// ============================================================================
// Request / Response — Contract Clients
// ============================================================================

export interface ContractClient {
  clientId: number;
  clientName: string;
  contactName: string;
  address: SpeedyAddress;
  email: string;
  phone: string;
}

export interface ContractClientsResponse {
  clients: ContractClient[];
}

// ============================================================================
// Request / Response — Destination Services
// ============================================================================

export interface DestinationServicesParams {
  senderClientId: number;
  senderSiteId?: number;
  recipientSiteId: number;
  date?: string;
}

export interface DestinationService {
  serviceId: number;
  name: string;
  nameEn: string;
  additionalServices?: { cod?: boolean; declaredValue?: boolean; obpd?: boolean };
}

export interface DestinationServicesResponse {
  services: DestinationService[];
}

// ============================================================================
// Request / Response — Pickup
// ============================================================================

export interface ShipmentPhoneNumber {
  number: string;
  extension?: string;
}

export type PickupScope =
  | 'EXPLICIT_SHIPMENT_ID_LIST'
  | 'ALL_CREATED_BY_LOGGED_USER'
  | 'ALL_CREATED_BY_SAME_CLIENT'
  | 'ALL_CREATED_BY_SAME_CONTRACT_USERS';

export interface PickupRequestParams {
  /** yyyy-MM-dd'T'HH:mm:ssZ; defaults to now on Speedy's side */
  pickupDateTime?: string;
  autoAdjustPickupDate?: boolean;
  pickupScope?: PickupScope;
  explicitShipmentIdList?: string[];
  /** HH:mm — latest time the courier may visit */
  visitEndTime: string;
  contactName?: string;
  phoneNumber?: ShipmentPhoneNumber;
}

export interface PickupOrder {
  id: number;
  shipmentIds: string[];
  pickupPeriodFrom?: string;
  pickupPeriodTo?: string;
}

export interface PickupResponse {
  orders: PickupOrder[];
}

export interface PickupTermsParams {
  serviceId: number;
  /** yyyy-MM-dd, not before today */
  startingDate?: string;
  sender?: CalculationSender;
  senderHasPayment?: boolean;
}

export interface PickupTermsResponse {
  /** yyyy-MM-dd'T'HH:mm:ssZ — one per day pickup is allowed */
  cutoffs: string[];
}
