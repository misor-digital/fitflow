/**
 * Brevo Template API Wrapper
 *
 * List and manage transactional email templates via Brevo API.
 * Templates are created in the Brevo dashboard — this provides
 * read access for admin display and validation.
 */

import { getTransactionalEmailsApi } from '../client';

export interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface TemplateListResult {
  success: boolean;
  templates?: BrevoTemplate[];
  totalCount?: number;
  error?: string;
}

/**
 * List available transactional email templates from Brevo
 */
export async function listBrevoTemplates(
  options?: { limit?: number; offset?: number; sort?: 'asc' | 'desc' }
): Promise<TemplateListResult> {
  try {
    const api = getTransactionalEmailsApi();
    const response = await api.getSmtpTemplates(
      options?.sort === 'asc' ? true : undefined,
      options?.limit ?? 50,
      options?.offset ?? 0
    );

    return {
      success: true,
      templates: response.body.templates?.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        isActive: t.isActive,
        createdAt: t.createdAt,
        modifiedAt: t.modifiedAt,
      })) ?? [],
      totalCount: response.body.count ?? 0,
    };
  } catch (error) {
    console.error('Error listing Brevo templates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error listing templates',
    };
  }
}

/**
 * Get a specific template by ID — used for validation
 */
export async function getBrevoTemplate(templateId: number): Promise<{
  success: boolean;
  template?: BrevoTemplate;
  error?: string;
}> {
  try {
    const api = getTransactionalEmailsApi();
    const response = await api.getSmtpTemplate(templateId);

    return {
      success: true,
      template: {
        id: response.body.id,
        name: response.body.name,
        subject: response.body.subject,
        isActive: response.body.isActive,
        createdAt: response.body.createdAt,
        modifiedAt: response.body.modifiedAt,
      },
    };
  } catch (error) {
    console.error('Error fetching Brevo template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching template',
    };
  }
}
