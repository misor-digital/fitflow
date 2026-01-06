/**
 * Marketing Campaign Template Registry
 * 
 * Central registry for all email templates.
 * Provides functions to get templates and generate emails.
 * 
 * NOTE: This module is designed to be safe for client-side imports.
 * Server-only functions (generateEmail) use dynamic imports for crypto/supabase.
 */

import type { TemplateDefinition, TemplateVariables, VariableDefinition } from './types';
import { discountTemplate } from './discount';

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
// Registry Functions (Client-Safe)
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
 * NOTE: This function should only be called server-side as it uses crypto
 * 
 * @param templateId - Template identifier
 * @param variables - Template variables (must include email)
 * @param campaignId - Campaign ID for tracking and attribution
 * @param recipientId - Recipient ID for attribution (optional)
 * @returns Generated HTML string
 */
export async function generateEmail(
  templateId: string,
  variables: TemplateVariables,
  campaignId?: string,
  recipientId?: string
): Promise<string> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Dynamically import server-only module to avoid client-side issues
  const { generateSignedUnsubscribeUrl } = await import('../unsubscribeToken');

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
 * Safe to call from client components
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
