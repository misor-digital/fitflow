import { EMAIL } from './constants';

/**
 * Wraps inner body HTML in a complete HTML email document with
 * the standard FitFlow header, footer, and outer table skeleton.
 *
 * @param bodyHtml - The inner HTML to place between the header and footer.
 * @returns A complete, trimmed HTML email string.
 */
export function wrapInEmailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 0; font-family: ${EMAIL.typography.fontFamily}; background-color: ${EMAIL.colors.background};">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: ${EMAIL.layout.maxWidth}; max-width: 100%; border-collapse: collapse; background-color: ${EMAIL.colors.containerBg}; border-radius: ${EMAIL.layout.borderRadius}; box-shadow: ${EMAIL.layout.containerShadow};">
          <!-- Header -->
          <tr>
            <td style="background: ${EMAIL.colors.headerGradient}; padding: 40px 30px; text-align: center; border-radius: ${EMAIL.layout.borderRadius} ${EMAIL.layout.borderRadius} 0px 0px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">${EMAIL.brand.name}</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${EMAIL.brand.tagline}</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${EMAIL.colors.footerBg}; padding: 30px; text-align: center; border-radius: 0 0 ${EMAIL.layout.borderRadius} ${EMAIL.layout.borderRadius};">
              <p style="color: ${EMAIL.colors.textFooter}; font-size: 14px; margin: 0 0 10px 0;">
                ${EMAIL.brand.footerSignOff}<br><strong>${EMAIL.brand.footerTeam}</strong> 💪
              </p>
              <p style="color: ${EMAIL.colors.textFooterSecondary}; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${EMAIL.brand.name}. Всички права запазени.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Returns the standard FitFlow CTA button HTML block.
 *
 * @param href  - The URL the button links to.
 * @param label - The visible button text.
 * @returns An HTML string containing a centered call-to-action button.
 */
export function emailCtaButton(href: string, label: string): string {
  return `<div style="text-align: center; margin: 30px 0;">
  <a href="${href}" style="display: inline-block; background-color: ${EMAIL.colors.ctaButton}; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; text-decoration: none;">
    ${label}
  </a>
</div>`;
}

/**
 * Returns the standard "Ако имате въпроси" contact paragraph
 * used across all email templates.
 *
 * @returns An HTML string with a mailto link to the brand contact email.
 */
export function emailContactLine(): string {
  return `<p style="color: ${EMAIL.colors.textPrimary}; font-size: 16px; line-height: 1.6;">
  Ако имате въпроси, свържете се с нас на
  <a href="mailto:${EMAIL.brand.contactEmail}" style="color: ${EMAIL.colors.linkColor}; font-weight: 600;">
    ${EMAIL.brand.contactEmail}
  </a>
</p>`;
}
