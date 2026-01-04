/**
 * Campaign email template utilities
 * Simple template rendering with variable substitution
 */

import type { TemplateVariables } from './types';
import { generateSignedUnsubscribeUrl } from './unsubscribeToken';

/**
 * Render a template with variable substitution
 * Variables are in the format {{variable_name}}
 * 
 * @param template - HTML template string with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns Rendered HTML string
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let rendered = template;

  // Replace all {{variable}} patterns
  const variablePattern = /\{\{(\w+)\}\}/g;
  
  rendered = rendered.replace(variablePattern, (match, variableName) => {
    const value = variables[variableName];
    if (value !== undefined) {
      return escapeHtml(String(value));
    }
    // Keep the placeholder if variable not found (for debugging)
    return match;
  });

  return rendered;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Generate an unsubscribe URL for a recipient
 */
export function generateUnsubscribeUrl(
  email: string,
  campaignId?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fitflow.bg';
  const params = new URLSearchParams({
    email: email,
    ...(campaignId && { campaign: campaignId }),
  });
  
  return `${baseUrl}/unsubscribe?${params.toString()}`;
}

/**
 * Create a basic marketing email wrapper
 * This provides consistent header/footer for all marketing emails
 */
export function wrapEmailContent(
  content: string,
  options: {
    previewText?: string;
    unsubscribeUrl?: string;
  } = {}
): string {
  const { previewText, unsubscribeUrl } = options;
  
  const previewTextHtml = previewText
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</div>`
    : '';

  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Отписване от бюлетина</a>
      </p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FitFlow</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f3f0;">
  ${previewTextHtml}
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; background-color: #f6f3f0;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9c3b00 0%, #ff6a00 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">FitFlow</h1>
              <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Защото можем</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fdf6f1; padding: 25px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #7a4a2a; font-size: 14px; margin: 0 0 10px 0;">
                С любов към спорта,<br>
                <strong>Екипът на FitFlow</strong>
              </p>
              <p style="color: #7a4a2a; font-size: 14px; margin: 0 0 10px 0;">
                <a href="mailto:info@fitflow.bg" style="color: #9c3b00; text-decoration: none; font-weight: 600;">info@fitflow.bg</a>
                &nbsp;|&nbsp;
                <a href="tel:+359879447845" style="color: #9c3b00; text-decoration: none; font-weight: 600;">+359 879 447 845</a>
              </p>
              <p style="margin: 15px 0 10px 0;">
                <a href="https://www.facebook.com/people/FitFlow/61584666749010/" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                  <img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" width="24" height="24" style="vertical-align: middle;" />
                </a>
                <a href="https://www.instagram.com/fitflowbg" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                  <img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" alt="Instagram" width="24" height="24" style="vertical-align: middle;" />
                </a>
                <a href="https://www.tiktok.com/@fitflow.bg" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                  <img src="https://cdn-icons-png.flaticon.com/24/3046/3046121.png" alt="TikTok" width="24" height="24" style="vertical-align: middle;" />
                </a>
              </p>
              <p style="color: #b08968; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} FitFlow. Всички права запазени.
              </p>
              ${unsubscribeHtml}
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Create a simple marketing email from content
 * Uses signed unsubscribe URLs for security
 */
export function createMarketingEmail(
  content: string,
  variables: TemplateVariables,
  options: {
    previewText?: string;
    campaignId?: string;
  } = {}
): string {
  // Generate signed unsubscribe URL
  const unsubscribeUrl = generateSignedUnsubscribeUrl(variables.email, options.campaignId);
  
  // Add unsubscribe_url to variables for template use
  const variablesWithUnsubscribe: TemplateVariables = {
    ...variables,
    unsubscribe_url: unsubscribeUrl,
  };
  
  // Render variables in content
  const renderedContent = renderTemplate(content, variablesWithUnsubscribe);
  
  // Wrap in email template
  return wrapEmailContent(renderedContent, {
    previewText: options.previewText,
    unsubscribeUrl,
  });
}

/**
 * Extract variables from a template
 * Useful for validation and documentation
 */
export function extractTemplateVariables(template: string): string[] {
  const variablePattern = /\{\{(\w+)\}\}/g;
  const variables: Set<string> = new Set();
  
  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  template: string,
  variables: TemplateVariables
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(template);
  const missing = required.filter((v) => variables[v] === undefined);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
