/**
 * Speedy Courier API Client
 *
 * Server-only HTTP client for Speedy.bg REST API v1.
 * All endpoints are POST with JSON body; credentials are injected automatically.
 */

import 'server-only';

import type {
  SpeedyCredentials,
  FindOfficeParams,
  FindOfficeResponse,
  FindSiteParams,
  FindSiteResponse,
  CreateShipmentParams,
  CreateShipmentResponse,
  CalculateParams,
  CalculateResponse,
  PrintParams,
  TrackParams,
  TrackResponse,
  CancelShipmentParams,
  ContractClientsResponse,
} from './types';

// ============================================================================
// Config
// ============================================================================

const SPEEDY_API_BASE = 'https://api.speedy.bg/v1';

// ============================================================================
// Error Class
// ============================================================================

export class SpeedyApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'SpeedyApiError';
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function getCredentials(): SpeedyCredentials {
  const userName = process.env.SPEEDY_USERNAME;
  const password = process.env.SPEEDY_PASSWORD;
  if (!userName || !password) {
    throw new Error('Missing SPEEDY_USERNAME or SPEEDY_PASSWORD env vars');
  }
  return { userName, password };
}

/**
 * Generic JSON request to the Speedy API.
 * Injects credentials and language, handles both HTTP and in-body errors.
 */
async function speedyRequest<TRes>(
  endpoint: string,
  data: Record<string, unknown> = {}
): Promise<TRes> {
  const credentials = getCredentials();
  const body = {
    ...data,
    userName: credentials.userName,
    password: credentials.password,
    language: 'BG',
  };

  const response = await fetch(`${SPEEDY_API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new SpeedyApiError(
      `Speedy API error (${response.status}): ${errorBody}`,
      response.status,
      errorBody
    );
  }

  const json = await response.json();

  // Speedy sometimes returns 200 with an error object in the body
  if (json.error) {
    throw new SpeedyApiError(
      json.error.message || 'Unknown Speedy API error',
      200,
      JSON.stringify(json.error),
      json.error.context
    );
  }

  return json as TRes;
}

/**
 * Binary request for PDF label downloads.
 */
async function speedyBinaryRequest(
  endpoint: string,
  data: Record<string, unknown>
): Promise<ArrayBuffer> {
  const credentials = getCredentials();
  const body = {
    ...data,
    userName: credentials.userName,
    password: credentials.password,
  };

  const response = await fetch(`${SPEEDY_API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new SpeedyApiError(
      `Speedy API error (${response.status})`,
      response.status,
      errorBody
    );
  }

  return response.arrayBuffer();
}

// ============================================================================
// Public API Methods
// ============================================================================

/** Find Speedy offices/automats matching the given criteria. */
export async function findOffices(
  params: FindOfficeParams
): Promise<FindOfficeResponse> {
  return speedyRequest<FindOfficeResponse>(
    'location/office/',
    params as unknown as Record<string, unknown>
  );
}

/** Find sites (cities/towns) by name or post code. */
export async function findSite(
  params: FindSiteParams
): Promise<FindSiteResponse> {
  return speedyRequest<FindSiteResponse>(
    'location/site/',
    params as unknown as Record<string, unknown>
  );
}

/** Create a new shipment and receive a waybill number. */
export async function createShipment(
  params: CreateShipmentParams
): Promise<CreateShipmentResponse> {
  return speedyRequest<CreateShipmentResponse>(
    'shipment/',
    params as unknown as Record<string, unknown>
  );
}

/** Calculate shipping price without creating a shipment. */
export async function calculateShipment(
  params: CalculateParams
): Promise<CalculateResponse> {
  return speedyRequest<CalculateResponse>(
    'calculate/',
    params as unknown as Record<string, unknown>
  );
}

/** Download shipping label(s) as PDF binary. */
export async function printLabels(params: PrintParams): Promise<ArrayBuffer> {
  return speedyBinaryRequest(
    'print/',
    params as unknown as Record<string, unknown>
  );
}

/** Track parcels by their IDs. */
export async function trackParcels(
  params: TrackParams
): Promise<TrackResponse> {
  return speedyRequest<TrackResponse>(
    'track/',
    params as unknown as Record<string, unknown>
  );
}

/** Cancel a shipment by parcel IDs. */
export async function cancelShipment(
  params: CancelShipmentParams
): Promise<void> {
  await speedyRequest<unknown>(
    'shipment/cancel/',
    params as unknown as Record<string, unknown>
  );
}

/** Get contract clients linked to the account. */
export async function getContractClients(): Promise<ContractClientsResponse> {
  return speedyRequest<ContractClientsResponse>('client/contract/');
}
