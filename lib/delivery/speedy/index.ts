/**
 * Speedy Courier Integration
 *
 * Server-only module for interacting with the Speedy.bg shipping API.
 * Import directly: `import { createShipment } from '@/lib/delivery/speedy'`
 */

export type {
  SpeedyCredentials,
  SpeedyAddress,
  SpeedyOffice,
  SpeedySite,
  ShipmentParty,
  ShipmentService,
  ShipmentParcel,
  ShipmentContent,
  ShipmentPayment,
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
  TrackingOperation,
  TrackResponse,
  CancelShipmentParams,
  ContractClient,
  ContractClientsResponse,
  DestinationServicesParams,
  DestinationService,
  DestinationServicesResponse,
} from './types';

export {
  SpeedyApiError,
  findOffices,
  findSite,
  createShipment,
  calculateShipment,
  printLabels,
  trackParcels,
  cancelShipment,
  getContractClients,
  getDestinationServices,
} from './client';

export { getSpeedySenderConfig, SPEEDY_SENDER_CLIENT_ID, SPEEDY_SERVICE_ID, BGN_TO_EUR_RATE, bgnToEur, eurToBgn } from './config';

export type { OrderForShipment, WaybillResult } from './shipments';
export { createWaybillForOrder, buildShipmentRequest } from './shipments';

export type { LabelFormat } from './labels';
export { generateLabels, generateLabelsInBatches, mergePdfBuffers } from './labels';

export type { TrackingResult } from './tracking';
export {
  FINAL_STATUS_CODES,
  STATUS_LABELS,
  STATUS_CODE_TO_STRING,
  STATUS_COLORS,
  isFinalStatus,
  getStatusLabel,
  getStatusString,
  trackParcelsBulk,
  trackParcelFull,
} from './tracking';

export type { CancellationResult } from './cancellation';
export { cancelWaybill } from './cancellation';
