/**
 * Brevo API Wrapper — Barrel Exports
 */

export {
  sendTransactionalEmail,
  sendTransactionalTemplateEmail,
  setOnEmailSentCallback,
} from './transactional';
export type { OnEmailSent } from './transactional';

export {
  createBrevoCampaign,
  sendBrevoCampaign,
  sendBrevoCampaignTest,
  getBrevoCampaignStats,
  deleteBrevoCampaign,
} from './campaigns';
export type { CreateCampaignOptions, CampaignResult, CampaignStatsResult } from './campaigns';

export {
  syncCustomerContact,
  syncSubscriptionToContact,
  syncOrderToContact,
  addToBrevoList,
  getBrevoContact,
  removeContactFromList,
  getBrevoLists,
  getListContacts,
} from './contacts';
export type { FitFlowContactAttributes, BrevoListInfo, BrevoListContact } from './contacts';

export {
  listBrevoTemplates,
  getBrevoTemplate,
} from './templates';
export type { BrevoTemplate, TemplateListResult } from './templates';
