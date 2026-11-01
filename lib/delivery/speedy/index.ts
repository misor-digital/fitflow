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
  CalculationSender,
  CalculationRecipient,
  CalculationAddressLocation,
  CalculationService,
  ShipmentAdditionalServices,
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

export {
  getSpeedySenderConfig,
  getSpeedyPickupDefaults,
  SPEEDY_SENDER_CLIENT_ID,
  SPEEDY_SERVICE_ID,
  BGN_TO_EUR_RATE,
  bgnToEur,
  eurToBgn,
} from './config';
export type { SpeedyPickupDefaults } from './config';

export type {
  OrderForShipment,
  WaybillResult,
  ShipmentRequestOptions,
  CalculationRequestOptions,
} from './shipments';
export { createWaybillForOrder, buildShipmentRequest, buildCalculationRequest } from './shipments';

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

export type { CancelOrderWaybillResult, CancelOrderWaybillFailureReason, CancelActor } from './cancellation';
export { cancelWaybill, cancelOrderWaybill, normalizeCancelComment } from './cancellation';

export { mapCancelError } from './errors';
