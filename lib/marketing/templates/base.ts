/**
 * Base email template wrapper
 * Provides consistent header and footer for all marketing emails
 */

// ============================================================================
// HTML Escape Utility
// ============================================================================

export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// ============================================================================
// Base Email Wrapper
// ============================================================================

export interface WrapEmailOptions {
  /** Preview text shown in email clients */
  previewText?: string;
  /** Unsubscribe URL (for server-side) */
  unsubscribeUrl?: string;
  /** Whether this is a preview (shows placeholder instead of actual unsubscribe link) */
  isPreview?: boolean;
}

/**
 * Wrap email content with FitFlow header and footer
 */
export function wrapEmailContent(
  content: string,
  options: WrapEmailOptions = {}
): string {
  const { previewText, unsubscribeUrl, isPreview = false } = options;
  
  const previewTextHtml = previewText
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</div>`
    : '';

  // Unsubscribe section - different for preview vs actual send
  let unsubscribeHtml = '';
  if (isPreview) {
    unsubscribeHtml = `
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                <span style="color: #999999; text-decoration: underline;">[Линк за отписване]</span>
              </p>`;
  } else if (unsubscribeUrl) {
    unsubscribeHtml = `
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                <a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Отписване от бюлетина</a>
              </p>`;
  }

  const currentYear = new Date().getFullYear();

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
            <td style="background: linear-gradient(135deg, #9c3b00 0%, #ff6a00 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">FitFlow</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Защото можем</p>
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
            <td style="background-color: #fdf6f1; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
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
                © ${currentYear} FitFlow. Всички права запазени.
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
