/**
 * Marketing campaign template types
 */

// ============================================================================
// Variable Definition Types
// ============================================================================

export type VariableType = 'text' | 'richtext' | 'number' | 'checkbox' | 'url';

export interface VariableDefinition {
  key: string;
  label: string;
  type: VariableType;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  helpText?: string;
  maxLength?: number;
}

// ============================================================================
// Template Definition
// ============================================================================

export interface TemplateDefinition {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the template */
  description: string;
  /** Variable definitions for form generation */
  variables: VariableDefinition[];
  /** Generate HTML for server-side sending (includes unsubscribe URL and attribution) */
  generate: (variables: TemplateVariables, campaignId?: string, recipientId?: string) => string;
  /** Generate HTML for client-side preview (placeholder for unsubscribe) */
  generatePreview: (variables: TemplateVariables) => string;
}

// ============================================================================
// Template Variables
// ============================================================================

export interface TemplateVariables {
  /** Recipient email (required for unsubscribe URL) */
  email: string;
  /** Recipient name */
  name?: string;
  /** Unsubscribe URL (auto-generated for server-side) */
  unsubscribe_url?: string;
  /** Additional template-specific variables */
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Discount Campaign Variables
// ============================================================================

export interface DiscountCampaignVariables extends TemplateVariables {
  /** Discount percentage - used in heading and auto-generates promo code */
  discountPercent?: number;
  /** Main content section (rich text HTML) */
  main?: string;
  /** Steps section (rich text HTML) */
  steps?: string;
  /** CTA button text */
  buttonLabel?: string;
  /** Show free delivery banner */
  showFreeDelivery?: boolean;
  /** Campaign name for UTM parameter */
  campaignName?: string;
}
