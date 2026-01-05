/**
 * Marketing campaign module
 * Provides functionality for email marketing campaigns
 */

// Types
export type {
  CampaignStatus,
  SendStatus,
  MarketingCampaignRow,
  MarketingCampaignInsert,
  MarketingCampaignUpdate,
  MarketingRecipientRow,
  MarketingRecipientInsert,
  MarketingRecipientUpdate,
  MarketingSendRow,
  MarketingSendInsert,
  MarketingSendUpdate,
  RecipientFilter,
  CampaignProgress,
  TemplateVariables,
  CampaignRunnerConfig,
  CampaignRateLimits,
} from './types';

export { DEFAULT_RUNNER_CONFIG } from './types';

// Campaign Service
export {
  // Campaigns
  createCampaign,
  getCampaignById,
  updateCampaign,
  getAllCampaigns,
  getScheduledCampaignsReadyToSend,
  // Recipients
  upsertRecipient,
  getRecipientByEmail,
  getRecipientsByFilter,
  updateRecipientSubscription,
  bulkImportRecipients,
  // Sends
  createSendsForCampaign,
  getPendingSends,
  updateSend,
  markSendAsSent,
  markSendAsFailed,
  markSendAsSkipped,
  // Progress
  getCampaignProgress,
  syncCampaignStats,
  // Locking
  acquireCampaignLock,
  releaseCampaignLock,
} from './campaignService';

// Template Service (new)
export {
  getAllTemplates,
  getTemplate,
  getTemplateVariables,
  generateEmail,
  generateEmailPreview,
  escapeHtml,
  wrapEmailContent,
  discountTemplate,
} from './templates';

export type {
  TemplateDefinition,
  VariableDefinition,
  VariableType,
  DiscountCampaignVariables,
} from './templates';

// Campaign Runner
export {
  runCampaignProcessor,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getRunnerStatus,
  generateRunnerId,
} from './campaignRunner';

// Unsubscribe Token
export {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  generateSignedUnsubscribeUrl,
} from './unsubscribeToken';
