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
  SpeedyErrorBody,
  ContractClientsResponse,
  DestinationServicesParams,
  DestinationServicesResponse,
} from './types';

// ============================================================================
// Config
// ============================================================================

const SPEEDY_API_BASE = 'https://api.speedy.bg/v1';

// ============================================================================
// Error Class
// ============================================================================

export interface SpeedyApiErrorDetails {
  code?: number;
  errorId?: string;
  component?: string;
}

export class SpeedyApiError extends Error {
  public readonly code?: number;
  public readonly errorId?: string;
  public readonly component?: string;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
    public readonly context?: string,
    details: SpeedyApiErrorDetails = {}
  ) {
    super(message);
    this.name = 'SpeedyApiError';
    this.code = details.code;
    this.errorId = details.errorId;
    this.component = details.component;
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

function toErrorDetails(error: SpeedyErrorBody['error']): SpeedyApiErrorDetails {
  return {
    code: typeof error.code === 'number' ? error.code : undefined,
    errorId: error.id != null ? String(error.id) : undefined,
    component: error.component,
  };
}

/** Build a SpeedyApiError from a non-2xx response, using the Speedy error object when present. */
function buildHttpError(status: number, rawBody: string): SpeedyApiError {
  try {
    const parsed = JSON.parse(rawBody) as Partial<SpeedyErrorBody>;
    if (parsed?.error?.message) {
      return new SpeedyApiError(
        parsed.error.message,
        status,
        rawBody,
        parsed.error.context,
        toErrorDetails(parsed.error)
      );
    }
  } catch {
    // Not JSON — fall through
  }
  return new SpeedyApiError(`Speedy API error (${status})`, status, rawBody);
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
    throw buildHttpError(response.status, await response.text());
  }

  const json = await response.json();

  // Speedy sometimes returns 200 with an error object in the body
  if (json.error) {
    const error = json.error as SpeedyErrorBody['error'];
    throw new SpeedyApiError(
      error.message || 'Unknown Speedy API error',
      200,
      JSON.stringify(error),
      error.context,
      toErrorDetails(error)
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
    throw buildHttpError(response.status, await response.text());
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

/** Cancel a shipment by shipment (waybill) id. */
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

/** Get available courier services for a given sender → recipient route. */
export async function getDestinationServices(
  params: DestinationServicesParams
): Promise<DestinationServicesResponse> {
  return speedyRequest<DestinationServicesResponse>(
    'services/destination/',
    params as unknown as Record<string, unknown>
  );
}
