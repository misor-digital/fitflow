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
