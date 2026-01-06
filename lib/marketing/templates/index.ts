/**
 * Marketing Campaign Template Registry
 * 
 * Central registry for all email templates.
 * Provides functions to get templates and generate emails.
 */

import type { TemplateDefinition, TemplateVariables, VariableDefinition } from './types';
import { discountTemplate } from './discount';
import { generateSignedUnsubscribeUrl } from '../unsubscribeToken';

// ============================================================================
// Template Registry
// ============================================================================

/**
 * All available templates
 */
const TEMPLATES: TemplateDefinition[] = [
  discountTemplate,
  // Add more templates here as needed
];

/**
 * Template map for quick lookup
 */
const TEMPLATE_MAP = new Map<string, TemplateDefinition>(
  TEMPLATES.map(t => [t.id, t])
);

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateDefinition[] {
  return TEMPLATES;
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_MAP.get(id);
}

/**
 * Get template variable definitions for form generation
 */
export function getTemplateVariables(templateId: string): VariableDefinition[] {
  const template = getTemplate(templateId);
  return template?.variables ?? [];
}

// ============================================================================
// Email Generation Functions
// ============================================================================

/**
 * Generate email HTML for server-side sending
 * Automatically adds signed unsubscribe URL and click token for attribution
 * 
 * @param templateId - Template identifier
 * @param variables - Template variables (must include email)
 * @param campaignId - Campaign ID for tracking and attribution
 * @param recipientId - Recipient ID for attribution (optional)
 * @returns Generated HTML string
 */
export function generateEmail(
  templateId: string,
  variables: TemplateVariables,
  campaignId?: string,
  recipientId?: string
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Generate signed unsubscribe URL
  const unsubscribeUrl = generateSignedUnsubscribeUrl(variables.email, campaignId);

  // Add unsubscribe URL to variables
  const variablesWithUnsubscribe: TemplateVariables = {
    ...variables,
    unsubscribe_url: unsubscribeUrl,
  };

  // Pass campaignId and recipientId for click token generation
  return template.generate(variablesWithUnsubscribe, campaignId, recipientId);
}

/**
 * Generate email HTML for client-side preview
 * Does not include actual unsubscribe URL (shows placeholder)
 * 
 * @param templateId - Template identifier
 * @param variables - Template variables
 * @returns Generated HTML string for preview
 */
export function generateEmailPreview(
  templateId: string,
  variables: TemplateVariables
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return template.generatePreview(variables);
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  TemplateDefinition,
  TemplateVariables,
  VariableDefinition,
  VariableType,
  DiscountCampaignVariables,
} from './types';

export { escapeHtml, wrapEmailContent } from './base';
export { discountTemplate } from './discount';
